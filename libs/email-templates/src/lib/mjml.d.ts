declare module 'mjml' {
  export interface MJMLOptions {
    keepComments?: boolean;
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: 'strict' | 'soft' | 'skip';
    filePath?: string;
    fonts?: Record<string, string>;
    juiceOptions?: any;
    juicePreserveTags?: any;
    mjmlConfigPath?: string;
  }
  export interface MJMLError {
    line?: number;
    message: string;
    tagName?: string;
    formattedMessage?: string;
    type?: string;
  }
  export interface MJMLResult {
    html: string;
    errors: MJMLError[];
  }
  const mjml2html: (input: string, options?: MJMLOptions) => MJMLResult;
  export default mjml2html;
}
