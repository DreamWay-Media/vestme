import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette,
  Type,
  Highlighter,
  Sparkles
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface WysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  projectId?: string;
  context?: string;
  showAiImprove?: boolean;
}

export function WysiwygEditor({ 
  content, 
  onChange, 
  placeholder = "Start typing...", 
  className = "",
  minHeight = "min-h-[100px]",
  projectId,
  context,
  showAiImprove = true
}: WysiwygEditorProps) {
  const { toast } = useToast();
  const [isImproving, setIsImproving] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Remove the built-in underline extension to avoid conflicts
        strike: false,
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${minHeight} p-4`,
      },
    },
  });

  const improveTextMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !content) throw new Error('Missing required data');
      return await apiRequest('POST', `/api/projects/${projectId}/ai-improve-text`, {
        text: content,
        context: context || 'slide content'
      });
    },
    onSuccess: (data: any) => {
      if (data.improvedText && editor) {
        editor.commands.setContent(data.improvedText);
        onChange(data.improvedText);
        toast({
          title: "Content Improved",
          description: "AI has enhanced your content based on your project information.",
        });
      }
      setIsImproving(false);
    },
    onError: (error) => {
      console.error('Failed to improve text:', error);
      toast({
        title: "Improvement Failed",
        description: "Could not improve the content. Please try again.",
        variant: "destructive",
      });
      setIsImproving(false);
    },
  });

  const handleImproveText = () => {
    if (!content?.trim()) {
      toast({
        title: "No Content",
        description: "Please add some text first before improving it.",
        variant: "destructive",
      });
      return;
    }
    setIsImproving(true);
    improveTextMutation.mutate();
  };

  if (!editor) {
    return null;
  }

  const fontFamilies = [
    'Inter',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Courier New',
    'Roboto',
    'Open Sans',
    'Montserrat',
    'Lato',
    'Nunito',
    'Poppins'
  ];

  const fontSize = [
    { label: 'Small', value: '12px' },
    { label: 'Normal', value: '16px' },
    { label: 'Large', value: '20px' },
    { label: 'Extra Large', value: '24px' },
    { label: 'Huge', value: '32px' }
  ];

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive('bold') ? 'default' : 'outline'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('italic') ? 'default' : 'outline'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive('underline') ? 'default' : 'outline'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Font Family */}
        <Select
          value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
          onValueChange={(value) => {
            if (value === 'unset') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">Default</SelectItem>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-gray-300" />

        {/* Text Alignment */}
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Text Color</label>
                <Input
                  type="color"
                  value={editor.getAttributes('textStyle').color || '#000000'}
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                  className="w-full h-10"
                />
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[
                  '#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981',
                  '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF', '#F3F4F6', '#E5E7EB'
                ].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={editor.isActive('highlight') ? 'default' : 'outline'}
              size="sm"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Highlight Color</label>
                <Input
                  type="color"
                  value="#FBBF24"
                  onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                  className="w-full h-10"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['#FBBF24', '#FEF3C7', '#DBEAFE', '#E0E7FF'].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                className="w-full"
              >
                Remove Highlight
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-gray-300" />

        {/* Clear Formatting */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          Clear
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="prose-editor"
        placeholder={placeholder}
      />
    </div>
  );
}