import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Heart,
  Github,
  Linkedin,
  Code2,
  Cpu,
  Palette,
  ShieldCheck,
} from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  initials: string;
  bio: string;
  github?: string;
  linkedin?: string;
  website?: string;
  contributions: string[];
}

const teamMembers: TeamMember[] = [
  {
    name: "Pintu Kumar",
    role: "Full Stack Developer",
    initials: "PK",
    bio: "Builds core product architecture, multi-model orchestration, and interface systems.",
    github: "https://github.com/pintu544",
    contributions: [
      "Multi-AI orchestration",
      "Real-time chat UX",
      "Fallback reliability",
      "Responsive interface",
      "Performance tuning",
    ],
  },
  {
    name: "Yashashwi Anand",
    role: "Contributor",
    initials: "YA",
    bio: "Contributes feedback loops, testing, and iterative improvements across releases.",
    github: "https://github.com/Yashaswi-Anand",
    contributions: [
      "Bug reports",
      "Feature feedback",
      "Testing support",
      "Documentation review",
    ],
  },
];

const technologies = [
  { name: "React 19", icon: Cpu },
  { name: "TypeScript", icon: Code2 },
  { name: "Tailwind CSS", icon: Palette },
  { name: "Framer Motion", icon: Palette },
  { name: "Firebase", icon: ShieldCheck },
  { name: "Groq", icon: Cpu },
  { name: "Gemini", icon: Cpu },
  { name: "OpenAI", icon: Cpu },
  { name: "OpenRouter", icon: Cpu },
  { name: "GitHub Models", icon: Cpu },
  { name: "Cohere", icon: Cpu },
  { name: "xAI", icon: Cpu },
];

export function Credits() {
  return (
    <div className="mx-auto max-w-6xl space-y-7 sm:space-y-8 px-1 sm:px-2 surface-enter">
      <section className="surface-enter">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground sm:mb-6 sm:text-2xl font-display section-title">
          <Heart className="h-5 w-5 text-red-500" />
          Team
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
          {teamMembers.map((member) => (
            <Card key={member.name} className="overflow-hidden border-border/70 bg-card/75 shadow-none surface-enter surface-enter-delay-1">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                    {member.initials}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="line-clamp-1 text-base sm:text-lg">{member.name}</CardTitle>
                    <Badge variant="secondary" className="border border-border/70 bg-background/70 text-xs">
                      {member.role}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{member.bio}</p>

                <div>
                  <h4 className="mb-2 text-xs font-medium sm:text-sm">Contributions</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {member.contributions.map((contribution) => (
                      <Badge key={contribution} variant="outline" className="text-[10px] sm:text-xs">
                        {contribution}
                      </Badge>
                    ))}
                  </div>
                </div>

                {(member.github || member.linkedin || member.website) && (
                  <div className="flex gap-1 pt-1">
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-transparent p-2 transition hover:border-border/70 hover:bg-muted"
                        title="GitHub"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-transparent p-2 transition hover:border-border/70 hover:bg-muted"
                        title="LinkedIn"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {member.website && (
                      <a
                        href={member.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-transparent p-2 transition hover:border-border/70 hover:bg-muted"
                        title="Website"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="surface-enter surface-enter-delay-2">
        <h3 className="mb-3 text-lg font-semibold sm:text-xl section-title">Built with</h3>
        <Card className="overflow-hidden border-border/70 bg-card/75 shadow-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-3">
              {technologies.map((tech) => {
                const Icon = tech.icon;
                return (
                  <div
                    key={tech.name}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 p-2 text-xs sm:text-sm"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="truncate font-medium">{tech.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 surface-enter surface-enter-delay-3">
        <CardContent className="p-5 text-center sm:p-6">
          <h3 className="mb-2 text-base font-semibold sm:text-lg font-display header-title-gradient">AI Chat Fusion</h3>
          <p className="mx-auto mb-4 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            A multi-model AI workspace built for speed, reliability, and better answer quality through model diversity.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="text-[10px] sm:text-xs">MIT License</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs">Open Source</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs">TypeScript</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="border-t border-border/70 py-4 text-center">
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground sm:text-sm">
          Built with <Heart className="h-3.5 w-3.5 text-red-500" /> by the AI Chat Fusion team
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
          Copyright 2025 AI Chat Fusion
        </p>
      </div>
    </div>
  );
}
