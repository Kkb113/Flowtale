import fontList from './font_list';

interface ApiProp {
    items: string[]
  }

export const getWebFonts = async (): Promise<ApiProp> => ({ items: fontList });
