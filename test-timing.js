// Test timing logic for animation system
class MockElement {
  constructor(attrs = {}, parent = null) {
    this.attrs = attrs;
    this.parent = parent;
    this.children = [];
    if (parent) parent.children.push(this);
    this.style = {};
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

  querySelector() {
    return null;
  }
  offsetHeight = 0;
}

// Copy functions from useScrollAnimations.js
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

const findAnimationScope = element => {
  let current = element.parentElement;
  while (current) {
    if (current.hasAttribute('data-animate-scope')) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

const getAnimationConfig = element => {
  const trigger =
    getInheritedAttribute(element, 'data-animate-trigger') ||
    getInheritedAttribute(element, 'data-animate-default-trigger') ||
    'scroll';

  const delayStr =
    getInheritedAttribute(element, 'data-animate-delay') ||
    getInheritedAttribute(element, 'data-animate-default-delay');
  const delay = delayStr ? parseInt(delayStr) : 0;

  const staggerStr =
    getInheritedAttribute(element, 'data-animate-stagger') ||
    getInheritedAttribute(element, 'data-animate-default-stagger');
  const stagger = staggerStr ? parseInt(staggerStr) : 0;

  const distance =
    getInheritedAttribute(element, 'data-animate-distance') ||
    getInheritedAttribute(element, 'data-animate-default-distance');

  const rotate =
    getInheritedAttribute(element, 'data-animate-rotate') ||
    getInheritedAttribute(element, 'data-animate-default-rotate');

  return { trigger, delay, stagger, distance, rotate };
};

const getTotalDelay = (element, orderIndex) => {
  const config = getAnimationConfig(element);
  const parent = element.parentElement;

  // Priority 1: Parent-based staggering (most specific)
  if (parent && parent.hasAttribute('data-animate-stagger')) {
    const parentStagger = parseInt(parent.getAttribute('data-animate-stagger')) || 0;
    const parentDelay = parseInt(parent.getAttribute('data-animate-delay')) || 0;
    const childIndex = Array.from(parent.children).indexOf(element);
    return parentDelay + parentStagger * childIndex;
  }

  // Priority 2: Scope-based timing
  const scope = findAnimationScope(element);
  if (scope) {
    return config.delay + config.stagger * orderIndex;
  }

  // Priority 3: Element-based staggering (individual stagger attribute)
  let totalDelay = config.delay;
  if (config.stagger > 0) {
    totalDelay += config.stagger * orderIndex;
  }

  return totalDelay;
};

console.log('=== Testing timing calculations ===');

// Scenario 1: HeroSection with default-stagger=800
const header = new MockElement({
  'data-animate-scope': '',
  'data-animate-default-trigger': 'load',
  'data-animate-default-preset': 'fade-up',
  'data-animate-default-stagger': '800',
});

const headingLine4 = new MockElement({ 'data-animate-order': '4' }, header);
const headingLine5 = new MockElement({ 'data-animate-order': '5' }, header);
const paragraph = new MockElement(
  { 'data-animate': 'slide-up', 'data-animate-order': '1' },
  header
);
const divider = new MockElement(
  { 'data-animate': 'divider-expander-show', 'data-animate-order': '0' },
  header
);

console.log('Heading line 4 delay (order 4):', getTotalDelay(headingLine4, 4));
console.log('Heading line 5 delay (order 5):', getTotalDelay(headingLine5, 5));
console.log('Paragraph delay (order 1):', getTotalDelay(paragraph, 1));
console.log('Divider delay (order 0):', getTotalDelay(divider, 0));

// Scenario 2: Parent with data-animate-stagger (should override)
const parentWithStagger = new MockElement({
  'data-animate-stagger': '100',
  'data-animate-delay': '200',
});
const child1 = new MockElement({}, parentWithStagger);
const child2 = new MockElement({}, parentWithStagger);
console.log('\nParent-based staggering:');
console.log('Child1 delay (index 0):', getTotalDelay(child1, 999)); // orderIndex ignored
console.log('Child2 delay (index 1):', getTotalDelay(child2, 999));

// Scenario 3: Same order values should have same delay
const scope = new MockElement({ 'data-animate-scope': '', 'data-animate-default-stagger': '50' });
const elemA = new MockElement({ 'data-animate-order': '2' }, scope);
const elemB = new MockElement({ 'data-animate-order': '2' }, scope);
const elemC = new MockElement({ 'data-animate-order': '3' }, scope);
console.log('\nSame order values:');
console.log('ElemA delay (order 2):', getTotalDelay(elemA, 2));
console.log('ElemB delay (order 2):', getTotalDelay(elemB, 2));
console.log('ElemC delay (order 3):', getTotalDelay(elemC, 3));

// Scenario 4: Element with explicit stagger/delay
const explicit = new MockElement(
  {
    'data-animate': 'fade-up',
    'data-animate-delay': '500',
    'data-animate-stagger': '200',
  },
  header
);
console.log('\nExplicit delay/stagger (no scope):', getTotalDelay(explicit, 3)); // orderIndex 3

// Scenario 5: Empty data-animate should not affect timing (but still has order)
const emptyAnimate = new MockElement({ 'data-animate': '', 'data-animate-order': '1' }, header);
console.log('Empty data-animate delay:', getTotalDelay(emptyAnimate, 1));

console.log('\n=== All timing tests completed ===');
