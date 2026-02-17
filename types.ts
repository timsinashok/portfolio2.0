export interface Point {
  x: number;
  y: number;
}

export interface Project {
  id: string;
  title: string;
  category?: string;
  description: string; // Short description
  longDescription: string[]; // Bullet points for detail view
  imageUrl: string;
  tech: string[];
  links: {
    github?: string;
    demo?: string;
    writeup?: string;
  };
}

export interface NavItem {
  label: string;
  path: string;
}