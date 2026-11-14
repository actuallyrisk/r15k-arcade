// Attribute writes shared by the mirror elements: compare first, so a sync that changes nothing
// touches nothing and assistive technology is not told about unchanged state.

/** Sets or removes an attribute unless it already has that value. */
export function setAttributeValue(element: Element, name: string, value: string | undefined): void {
  if (value === undefined) {
    element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}
