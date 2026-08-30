const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph'
};

const editorConfig = {
  theme: exampleTheme,
  onError(error: any) {
    throw error;
  },
};

export default editorConfig;
