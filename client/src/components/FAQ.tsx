import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      question: "How does the AI analysis work?",
      answer: "Our AI analyzes your business information, website content, and market data to generate comprehensive insights about your company, competitors, and target market. It then uses this information to create tailored pitch deck content that resonates with investors."
    },
    {
      question: "Can I customize the generated pitch deck?",
      answer: "Absolutely! While our AI creates the foundation, you have complete control to customize every aspect of your pitch deck. Edit text, adjust layouts, change colors, add your own images, and modify slides to perfectly match your vision."
    },
    {
      question: "What formats can I export to?",
      answer: "You can export your pitch deck to PDF, PowerPoint (PPTX), and Google Slides formats. All exports maintain high quality and are optimized for both digital presentation and printing."
    },
    {
      question: "Is there a limit to how many pitch decks I can create?",
      answer: "The Starter plan includes 1 project generation, while the Professional plan offers unlimited project generations. You can create as many variations and iterations as you need."
    },
    {
      question: "How does the investor tracking work?",
      answer: "Our platform includes built-in analytics that track when investors view your deck, which slides they spend time on, and their engagement patterns. You can also manage investor contacts, schedule follow-ups, and run targeted campaigns through our integrated CRM."
    },
    {
      question: "Can I collaborate with my team?",
      answer: "Yes! Professional plan subscribers can invite team members to collaborate in real-time. Multiple users can work on the same deck simultaneously, leave comments, and track changes."
    },
    {
      question: "What kind of support do you offer?",
      answer: "All users receive email support. Professional plan subscribers get priority support with faster response times. We also have extensive documentation, video tutorials, and a community forum."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. If you cancel, you'll retain access to your Professional features until the end of your current billing period. All your data and pitch decks remain accessible even after cancellation."
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-8" data-testid="section-faq" id="faq">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-faq-title">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground" data-testid="text-faq-subtitle">
            Everything you need to know about VestMe.ai
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border rounded-lg px-6"
              data-testid={`accordion-item-${index}`}
            >
              <AccordionTrigger className="text-lg font-semibold text-left hover:no-underline py-4" data-testid={`accordion-trigger-${index}`}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4" data-testid={`accordion-content-${index}`}>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

