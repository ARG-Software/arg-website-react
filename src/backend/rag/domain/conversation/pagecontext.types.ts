export interface IPageContext {
  pathname: string;
  title: string;
  pageKind?: 'project' | 'homepage' | 'static_page' | 'blog_post';
  projectSlug?: string;
  projectName?: string;
  blogSlug?: string;
  activeSection?: string;
  sourceKeys?: string[];
}
