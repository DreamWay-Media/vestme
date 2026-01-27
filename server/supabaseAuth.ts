import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Allow the app to start without Supabase credentials in development
const hasSupabaseConfig = supabaseUrl && supabaseServiceKey;

if (!hasSupabaseConfig) {
  console.warn('WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are not set. Authentication features will be disabled.');
}

export const supabase = hasSupabaseConfig 
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Fixed dev user ID - must match the one in routes.ts
const DEV_USER_ID = 'dev-demo-user';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    // Dev mode: Check for dev user header first in development
    if (isDevelopment) {
      const devUserId = req.headers['x-dev-user-id'];
      if (devUserId === DEV_USER_ID) {
        try {
          const { storage } = await import('./storage');
          const devUser = await storage.getUser(DEV_USER_ID);
          if (devUser) {
            (req as any).user = { id: devUser.id, email: devUser.email };
            return next();
          }
        } catch (dbError) {
          console.error('Dev user lookup error:', dbError);
        }
      }
    }
    
    // If Supabase is not configured, reject in production
    if (!supabase) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ message: 'Authentication service is not configured' });
      }
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header:', req.headers.authorization);
      return res.status(401).json({ message: 'No valid authorization header' });
    }
    
    const token = authHeader.substring(7);
    console.log('Verifying token...');
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    if (!user) {
      console.log('No user found in token');
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    console.log('Token verified successfully for user:', user.id);
    
    // Ensure user exists in local database
    try {
      const { storage } = await import('./storage');
      
      // Check if user exists in database
      const dbUser = await storage.getUser(user.id);
      
      if (!dbUser) {
        console.log('User not found in database, creating record for:', user.id);
        
        // Extract user data from Supabase user metadata
        const fullName = user.user_metadata?.full_name || '';
        const firstName = fullName.split(' ')[0] || '';
        const lastName = fullName.split(' ').slice(1).join(' ') || '';
        
        // Create user in database
        await storage.upsertUser({
          id: user.id,
          email: user.email || '',
          firstName,
          lastName,
          profileImageUrl: user.user_metadata?.avatar_url || '',
        });
        
        console.log('User record created in database for:', user.id);
      }
    } catch (dbError) {
      console.error('Error ensuring user exists in database:', dbError);
      // Continue anyway - the user is authenticated via Supabase
      // This will cause issues downstream, but better to log and continue
    }
    
    // Add user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Setup authentication routes
export function setupAuth(app: Express) {
  app.use(getSession());
  
  // Google OAuth login endpoint
  app.get('/api/auth/google', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ message: 'Authentication service is not configured' });
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${req.protocol}://${req.get('host')}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        return res.status(500).json({ message: 'Failed to initiate Google login' });
      }
      
      res.json({ url: data.url });
    } catch (error) {
      console.error('Google OAuth setup error:', error);
      res.status(500).json({ message: 'Failed to setup Google login' });
    }
  });
  
  // OAuth callback endpoint
  app.get('/api/auth/callback', async (req, res) => {
    try {
      if (!supabase) {
        return res.redirect('/?auth=error&reason=not_configured');
      }
      
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'No authorization code provided' });
      }
      
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Code exchange error:', error);
        return res.status(500).json({ message: 'Failed to exchange code for session' });
      }
      
      // Store session in database if needed
      if (data.user) {
        try {
          // Import storage here to avoid circular dependencies
          const { storage } = await import('./storage');
          
          // Extract user data from Google OAuth
          const fullName = data.user.user_metadata?.full_name || '';
          const firstName = fullName.split(' ')[0] || '';
          const lastName = fullName.split(' ').slice(1).join(' ') || '';
          
          console.log('OAuth user data:', {
            id: data.user.id,
            email: data.user.email,
            fullName,
            firstName,
            lastName,
            metadata: data.user.user_metadata
          });
          
          // Store/update user in our database
          const userData = {
            id: data.user.id,
            email: data.user.email || '',
            firstName,
            lastName,
            profileImageUrl: data.user.user_metadata?.avatar_url || '',
          };
          
          const savedUser = await storage.upsertUser(userData);
          console.log('User data stored in database:', savedUser);
        } catch (error) {
          console.error('Error storing user data:', error);
          console.error('Error details:', error);
        }
      }
      
      // Redirect to frontend with success
      res.redirect('/?auth=success');
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect('/?auth=error');
    }
  });
  
  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (supabase && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await supabase.auth.signOut({ scope: 'local' });
      }
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Failed to logout' });
    }
  });
  
  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Import storage here to avoid circular dependencies
      const { storage } = await import('./storage');
      
      // Get user data from our database
      const dbUser = await storage.getUser(user.id);
      
      if (dbUser) {
        res.json({
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName || '',
          lastName: dbUser.lastName || '',
          profileImageUrl: dbUser.profileImageUrl || '',
        });
      } else {
        // Fallback to Supabase metadata if user not in our database
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
          lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: user.user_metadata?.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user profile endpoint
  app.put('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const { firstName, lastName } = req.body;
      
      // Import storage here to avoid circular dependencies
      const { storage } = await import('./storage');
      
      // Update user in our database
      const updatedUser = await storage.updateUser(user.id, {
        firstName,
        lastName,
      });
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        profileImageUrl: updatedUser.profileImageUrl || '',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });
}
