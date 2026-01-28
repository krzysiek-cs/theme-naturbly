// eslint-disable-next-line @typescript-eslint/ban-ts-comment

import "../../assets/_reset.scss";
import { createCollapsible } from "../../utils/collapsible";
import { formatMoney } from "../../utils/formatMoney";
import "./widget.scss";

declare global {
  interface Window {
    Shopify: unknown;
  }
}

type SellingPlanAllocation = {
  comparePrice: number;
  id: number;
  name: string;
  price: number;
};

type Variant = {
  available: boolean;
  id: number;
  price: number;
  sellingPlans: SellingPlanAllocation[];
};

(function () {
  function updatePrice(el, value, moneyFormat) {
    if (el == null) {
      return;
    }
    return (el.innerHTML =
      '<span class="money">' + formatMoney(value, moneyFormat) + "</span>");
  }

  function getAllocatedSellingPlanById(variant, id) {
    return variant.sellingPlans.find((plan) => plan.id === Number(id));
  }

  function initSellingPlanInput(form) {
    let el = form.querySelector('input[name="selling_plan"]');

    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = "selling_plan";
      form.append(el);
    }

    return el;
  }

  function initWidget(variants, variantId, moneyFormat) {
    const forms = Array.from(
      document.querySelectorAll('form[action$="/cart/add"]')
    );

    const sellingPlanInputs = forms.map(initSellingPlanInput);

    const widget = document.querySelector<HTMLElement>(
      "#juo-subscription-widget"
    )!;
    const priceElement = widget.querySelector('[part="subscription-price"]');
    const basePriceElement = widget.querySelector('[part="price price--base"]');
    const comparePriceElement = widget.querySelector<HTMLElement>(
      '[part="compare-price"]'
    );
    const sellingPlanSelectorElement =
      widget.querySelector<HTMLSelectElement>('[part="select"]')!;

    function getMode() {
      return widget.querySelector<HTMLInputElement>(
        'input[name="mode"]:checked'
      )!.value;
    }

    function getValue() {
      if (getMode() === "otp") {
        return "";
      }

      return widget.querySelector<HTMLSelectElement>("select")!.value;
    }

    function populateSellingPlanId() {
      const value = getValue();
      sellingPlanInputs.forEach((sellingPlanInput) => {
        sellingPlanInput.value = value;
      });
    }

    function getActiveVariant() {
      const url = new URL(window.location.href);
      const activeVariantId = url.searchParams.get("variant") || variantId;
      return (
        variants.find(({ id }) => id == activeVariantId) ||
        variants.find(Boolean)
      );
    }

    function updateSaveBadge(comparePrice, price) {
      const saveElement = widget.querySelector('[data-ref="save"]');

      if (saveElement) {
        const percentage = (price / comparePrice) * 100;
        saveElement.innerHTML = `${100 - Math.round(percentage)}`;
      }
    }

    function updateSellingPlans(
      sellingPlans: SellingPlanAllocation[] = [],
      activeVariantId
    ) {
      if (
        sellingPlanSelectorElement.dataset.activeVariant ===
        String(activeVariantId)
      ) {
        return;
      }

      let html = "";
      sellingPlans.forEach((plan) => {
        html += `<option value="${plan.id}">${plan.name}</option>`;
      });
      sellingPlanSelectorElement.innerHTML = html;

      if (sellingPlans.length === 0) {
        sellingPlanSelectorElement.value = "";
        return;
      }

      sellingPlanSelectorElement.dataset.activeVariant = activeVariantId;
      sellingPlanSelectorElement.value = (
        sellingPlanSelectorElement?.children[0] as HTMLOptionElement
      ).value;
      populateSellingPlanId();
    }

    function updateView() {
      const activeVariant = getActiveVariant();
      const allocatedPlan = getAllocatedSellingPlanById(
        activeVariant,
        sellingPlanSelectorElement.value
      );

      updateSellingPlans(activeVariant.sellingPlans, activeVariant.id);

      if (allocatedPlan == null) {
        widget?.classList.add("juo-hidden");
        return;
      } else {
        widget?.classList.remove("juo-hidden");
      }

      if (allocatedPlan.comparePrice > allocatedPlan.price) {
        updateSaveBadge(allocatedPlan.comparePrice, allocatedPlan.price);
      }

      updatePrice(basePriceElement, activeVariant.price, moneyFormat);
      updatePrice(priceElement, allocatedPlan.price, moneyFormat);
      if (
        allocatedPlan.price < allocatedPlan.comparePrice &&
        activeVariant.price !== allocatedPlan.price
      ) {
        updatePrice(
          comparePriceElement,
          allocatedPlan.comparePrice,
          moneyFormat
        );
      } else if (comparePriceElement) {
        comparePriceElement.innerHTML = "";
      }
    }

    const collapsibleEl = widget.querySelector<HTMLElement>(".collapsible");
    const collapsible =
      collapsibleEl == null
        ? null
        : createCollapsible(collapsibleEl, getMode() === "subscription");

    function update() {
      populateSellingPlanId();
      updateView();

      if (collapsible) {
        if (getMode() === "subscription") {
          collapsible.open();
        } else {
          collapsible.close();
        }
      }
    }

    update();
    document.addEventListener("change", update);
    sellingPlanSelectorElement.addEventListener("change", () => {
      widget
        .querySelector<HTMLInputElement>(
          'input[name="mode"][value="subscription"]'
        )!
        .click();
    });
  }

  function main() {
    if (window.Shopify != null) {
      // eslint-disable-next-line no-inner-declarations
      function init() {
        const [variants, variantId, moneyFormat] = JSON.parse(
          document.getElementById("juo-subscription-widget-data")?.innerText ??
            "[]"
        ) as [Variant[], number, string];

        initWidget(variants, variantId, moneyFormat);
      }

      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        init();
      } else {
        document.addEventListener("DOMContentLoaded", init);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
