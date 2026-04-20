// Test inheritance logic for animation system
// Simulate DOM elements with getAttribute and parentElement

class MockElement {
  constructor(attrs = {}, parent = null) {
    this.attrs = attrs;
    this.parent = parent;
    this.children = [];
    if (parent) parent.children.push(this);
  }

  getAttribute(name) {
    return this.attrs[name] !== undefined ? this.attrs[name] : null;
  }

  hasAttribute(name) {
    return this.attrs[name] !== undefined;
  }

  setAttribute(name, value) {
    this.attrs[name] = value;
  }

  get parentElement() {
    return this.parent;
  }
}

// Copy the actual functions from useScrollAnimations.js
const getInheritedAttribute = (element, attrName) => {
  const elementValue = element.getAttribute(attrName);
  if (elementValue !== null) {
    return elementValue;
  }

  let current = element.parentElement;
  while (current) {
    const ancestorValue = current.getAttribute(attrName);
    if (ancestorValue !== null) {
      return ancestorValue;
    }
    current = current.parentElement;
  }

  return null;
};

const getInheritedPreset = (element, _scope) => {
  const elementPreset = element.getAttribute('data-animate');

  if (elementPreset !== null && elementPreset !== '') {
    return elementPreset;
  }

  if (elementPreset === '') {
    return null;
  }

  const defaultPreset = getInheritedAttribute(element, 'data-animate-default-preset');
  if (defaultPreset) {
    return defaultPreset;
  }

  const ancestorPreset = getInheritedAttribute(element, 'data-animate');
  if (ancestorPreset && ancestorPreset !== '') {
    return ancestorPreset;
  }

  return null;
};

// Test scenario: HeroSection structure
console.log('=== Testing HeroSection inheritance ===');
const header = new MockElement({
  'data-animate-scope': '',
  'data-animate-default-trigger': 'load',
  'data-animate-default-preset': 'fade-up',
  'data-animate-default-stagger': '800',
});
const headingLine = new MockElement(
  {
    'data-animate-order': '4',
  },
  header
);
const headingLine2 = new MockElement(
  {
    'data-animate-order': '5',
  },
  header
);
const paragraph = new MockElement(
  {
    'data-animate': 'slide-up',
    'data-animate-order': '1',
  },
  header
);

console.log('Header preset:', getInheritedPreset(header, null)); // should be null (no data-animate)
console.log('Heading line 4 preset:', getInheritedPreset(headingLine, null)); // should be 'fade-up'
console.log('Heading line 5 preset:', getInheritedPreset(headingLine2, null)); // should be 'fade-up'
console.log('Paragraph preset:', getInheritedPreset(paragraph, null)); // should be 'slide-up'

// Test getInheritedAttribute
console.log('\n=== Testing attribute inheritance ===');
console.log(
  'heading line default-preset:',
  getInheritedAttribute(headingLine, 'data-animate-default-preset')
);
console.log(
  'heading line default-trigger:',
  getInheritedAttribute(headingLine, 'data-animate-default-trigger')
);
console.log(
  'heading line default-stagger:',
  getInheritedAttribute(headingLine, 'data-animate-default-stagger')
);

// Test empty data-animate
const emptyAnimate = new MockElement(
  {
    'data-animate': '',
  },
  header
);
console.log('Empty data-animate preset:', getInheritedPreset(emptyAnimate, null)); // should be null

// Test ancestor chain with data-animate
const grandparent = new MockElement({
  'data-animate': 'zoom-in',
});
const parent = new MockElement({}, grandparent);
const child = new MockElement({}, parent);
console.log('\nChild inherits ancestor data-animate:', getInheritedPreset(child, null)); // should be 'zoom-in'

// Test data-animate-default-preset overrides ancestor data-animate
const grandparent2 = new MockElement({
  'data-animate': 'zoom-in',
  'data-animate-default-preset': 'fade-down',
});
const parent2 = new MockElement({}, grandparent2);
const child2 = new MockElement({}, parent2);
console.log('Child inherits default-preset over regular:', getInheritedPreset(child2, null)); // should be 'fade-down'

console.log('\n=== All tests completed ===');
