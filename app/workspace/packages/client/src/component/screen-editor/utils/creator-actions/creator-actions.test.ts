import { hideChildren, unhideChildren, addImgMask, restrictCrtlType } from '.';

describe('hideChildren', () => {
  let parentElement: HTMLElement;

  beforeEach(() => {
    // Create a new parent element before each test
    parentElement = document.createElement('div');
    document.body.appendChild(parentElement);
  });

  afterEach(() => {
    // Clean up the parent element after each test
    parentElement.remove();
  });

  test('hides all children elements', () => {
    // Create three child elements
    const child1 = document.createElement('div');
    const child2 = document.createElement('span');
    const child3 = document.createElement('p');

    // Append the child elements to the parent element
    parentElement.appendChild(child1);
    parentElement.appendChild(child2);
    parentElement.appendChild(child3);

    // Call the hideChildren function
    hideChildren(parentElement);

    // Check that all children elements have the "visibility: hidden !important" style attribute
    Array.from(parentElement.children).forEach(child => {
      const style = window.getComputedStyle(child as Element);
      expect(style.getPropertyValue('visibility')).toBe('hidden');
      expect(style.getPropertyPriority('visibility')).toBe('important');
    });
  });

  test('does not affect non-child elements', () => {
    // Create a sibling element (not a child of the parent element)
    const siblingElement = document.createElement('div');
    document.body.appendChild(siblingElement);

    // Call the hideChildren function
    hideChildren(parentElement);

    // Check that the sibling element is not affected
    const style = window.getComputedStyle(siblingElement);
    expect(style.getPropertyValue('visibility')).not.toBe('hidden');
  });
});

describe('unhideChildren', () => {
  let parentElement: HTMLElement;

  beforeEach(() => {
    // Create a new parent element before each test
    parentElement = document.createElement('div');
    document.body.appendChild(parentElement);
  });

  afterEach(() => {
    // Clean up the parent element after each test
    parentElement.remove();
  });

  test('unhides all children elements', () => {
    // Create three child elements
    const child1 = document.createElement('div');
    const child2 = document.createElement('span');
    const child3 = document.createElement('p');

    // Set the "visibility: hidden !important" style for the child elements
    child1.setAttribute('style', 'visibility: hidden !important;');
    child2.setAttribute('style', 'visibility: hidden !important;');
    child3.setAttribute('style', 'visibility: hidden !important;');

    // Append the child elements to the parent element
    parentElement.appendChild(child1);
    parentElement.appendChild(child2);
    parentElement.appendChild(child3);

    // Call the unhideChildren function
    unhideChildren(parentElement);

    // Check that all children elements have the "visibility: hidden !important" style attribute removed
    Array.from(parentElement.children).forEach(child => {
      const style = window.getComputedStyle(child as Element);
      expect(style.getPropertyValue('visibility')).not.toBe('hidden');
    });
  });

  test('does not affect non-child elements', () => {
    // Create a sibling element (not a child of the parent element)
    const siblingElement = document.createElement('div');
    siblingElement.setAttribute('style', 'visibility: hidden !important;');
    document.body.appendChild(siblingElement);

    // Call the unhideChildren function
    unhideChildren(parentElement);

    // Check that the sibling element is not affected
    const style = window.getComputedStyle(siblingElement);
    expect(style.getPropertyValue('visibility')).toBe('hidden');
  });
});

describe('addImgMask', () => {
  let element: HTMLElement;

  beforeEach(() => {
    // Create a new element before each test
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    // Clean up the element after each test
    element.remove();
  });

  test('adds image mask styles to the element', () => {
    const originalimgSrc = 'https://www.dofactory.com/img/html/vangogh.jpg';
    const resizedImgSrc = 'https://www.dofactory.com/img/html/vangogh.jpg';

    // Call the addImgMask function
    const result = addImgMask(element, resizedImgSrc, originalimgSrc);

    // Check that the element has the correct background image and styles
    const style = window.getComputedStyle(element);
    expect(style.getPropertyValue('background-position')).toBe('center');
    expect(style.getPropertyValue('background-repeat')).toBe('no-repeat');
    expect(style.getPropertyValue('background-size')).toBe('cover');

    // Check that the returned maskStyles value matches the applied styles
    expect(result).toContain(`background-image: url(${resizedImgSrc}), url(${originalimgSrc}) !important`);
    expect(result).toContain('background-position: center !important');
    expect(result).toContain('background-repeat: no-repeat !important');
    expect(result).toContain('background-size: cover !important');
  });
});

describe('restrictCrtlType', () => {
  const el = document.createElement('img');

  it('should return false if the element type is restricted', () => {
    const result = restrictCrtlType(el, ['img']);
    expect(result).toBe(false);
  });

  it('should return true if the element type is not restricted', () => {
    const result = restrictCrtlType(el, ['div']);
    expect(result).toBe(true);
  });

  it('should return true if the elType array is empty', () => {
    const result = restrictCrtlType(el, []);
    expect(result).toBe(true);
  });
});
