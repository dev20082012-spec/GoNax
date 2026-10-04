export interface ScientificReferenceEntity {
  id: string;
  doi: string;
  citation_text: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  url: string;
  created_at?: string;
}
