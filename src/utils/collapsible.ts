export function createCollapsible(el: HTMLElement, initial = false) {
  let isOpen = initial;

  el.style.height = isOpen ? "auto" : "0";
  el.style.overflow = "hidden";

  function open() {
    if (isOpen) {
      return;
    }
    isOpen = true;

    const currentHeight = getComputedStyle(el).height;
    el.style.height = "auto";
    const height = getComputedStyle(el).height;
    el.style.height = currentHeight;
    getComputedStyle(el).height;
    requestAnimationFrame(function () {
      el.style.height = height;
    });
  }

  function close() {
    if (!isOpen) {
      return;
    }
    isOpen = false;

    const height = getComputedStyle(el).height;
    el.style.height = height;
    getComputedStyle(el).height;
    requestAnimationFrame(function () {
      el.style.height = "0";
    });
  }

  el.style.transition = "height 300ms ease-in-out";
  el.addEventListener("transitionend", function (e) {
    if (e.target !== el) {
      return;
    }
    if (isOpen) {
      el.style.height = "auto";
    }
  });

  return {
    open,
    close,
    el,
  };
}
