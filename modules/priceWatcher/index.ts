(() => {
  function updatePrice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picker = document.querySelector("variant-picker") as any;
    if (!picker || !picker.product) {
      return;
    }
    const sellingPlan = document.querySelector<HTMLInputElement>(
      'form input[name="selling_plan"]'
    );
    const sellingPlanId = sellingPlan == null ? "" : sellingPlan.value;

    picker.masterSelector.form.dispatchEvent(
      new CustomEvent("variant:change", {
        bubbles: true,
        detail: {
          product: picker.product,
          variant: sellingPlanId
            ? {
                ...picker.selectedVariant,
                price: picker.selectedVariant.selling_plan_allocations.find(
                  (item) => item.selling_plan_id == sellingPlanId
                ).price,
              }
            : picker.selectedVariant,
          previousVariant: picker.selectedVariant,
        },
      })
    );
  }

  function init() {
    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("variant:change", () => {
        setTimeout(() => updatePrice());
      });
    });

    const widget = document.getElementById("juo-subscription-widget");

    if (widget) {
      widget.addEventListener("change", () => setTimeout(() => updatePrice()));
    }

    setTimeout(() => {
      updatePrice();
    });

    window.addEventListener("load", () => updatePrice());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
