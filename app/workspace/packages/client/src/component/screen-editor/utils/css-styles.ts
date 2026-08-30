import { IAnnotationConfig } from '@fable/common/dist/types';

export const generateCSSSelectorFromText = (text: string): string => text.toLowerCase().trim().replace(/\W+/g, '-');

export const getDefaultAnnCSSStyleText = (config: IAnnotationConfig): string => {
  const cssSelector = `#f-a-i-${config.refId}.f-a-c-${config.refId}`;
  const buttonTexts = config.buttons.map(btn => btn.text);
  return `/* Write css for annotation container here here */
${cssSelector} {

}

/* Inner container */
${cssSelector} .f-inner-con {

}

/* Text content */
${cssSelector} .f-text p {

}

/* Button container */
${cssSelector} .f-button-con {

}

${buttonTexts.map(btnText => ` /* ${btnText} button */
${cssSelector} .f-${generateCSSSelectorFromText(btnText._val)}-btn {

}

`).join('')}
/* Progress indicator */
${cssSelector} .f-progress {

}

`;
};
