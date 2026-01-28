import "./cart-item-to-subscription.scss";

declare global {
  interface Window {
    Shopify: {
      routes: {
        root: string;
      };
    };
  }
}

(function () {
  const selectors = {
    checkbox: ".juo-subscribe-cart__selling-plans-checkbox",
    select: ".juo-subscribe-cart__selling-plan-switcher--select",
  };

  async function initializeSwitcher() {
    document.addEventListener("click", async function (event) {
      if (
        event.target != null &&
        "matches" in event.target &&
        (event.target as HTMLElement).matches(selectors.checkbox)
      ) {
        const checkbox = event.target as HTMLInputElement;

        if (checkbox.checked) {
          const variantId = checkbox.dataset.variantId;
          const sellingPlanSelect = document.querySelector(
            `select[data-variant-id="${variantId}"]`
          ) as HTMLSelectElement;
          await setSellingPlan(
            checkbox.dataset.variantId,
            sellingPlanSelect.value,
            checkbox.closest(".juo-subscribe-switcher")
          );
        } else {
          await removeSellingPlan(
            checkbox.dataset.variantId,
            checkbox.closest(".juo-subscribe-switcher")
          );
        }
      }
    });

    document.addEventListener("change", async function (event) {
      if (
        event.target != null &&
        "matches" in event.target &&
        (event.target as HTMLElement).matches(selectors.select)
      ) {
        const select = event.target as HTMLInputElement;

        await setSellingPlan(
          select.dataset.variantId,
          select.value,
          select.closest(".juo-subscribe-switcher")
        );
      }
    });
  }

  async function setSellingPlan(
    variantId: string | undefined,
    sellingPlanId: string,
    wrapper: HTMLElement | null
  ) {
    if (sellingPlanId == null) {
      return;
    }

    wrapper?.classList.add("loading");
    wrapper?.querySelector(".pill-loader")?.setAttribute("aria-busy", "true");

    const rootPath = window.Shopify.routes.root ?? "/";

    fetch(rootPath + "cart.js")
      .then((response) => response.json())
      .then(async function (cart) {
        for (const item of cart.items) {
          if (String(item.variant_id) === variantId) {
            const sectionsToBundle = [];
            document.documentElement.dispatchEvent(
              new CustomEvent("cart:prepare-bundled-sections", {
                bubbles: true,
                detail: { sections: sectionsToBundle },
              })
            );
            const cartContent = await (
              await fetch(rootPath + "cart/change.js", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  id: item.key,
                  quantity: item.quantity,
                  selling_plan: sellingPlanId,
                  properties: {
                    ...item.properties,
                    _juo_subscribe_cart: sellingPlanId,
                    _juo_source: "subscribe-cart",
                  },
                  sections: sectionsToBundle,
                }),
              })
            ).json();

            reloadCart(cartContent);
          }
        }
      })
      .finally(() => {
        wrapper?.classList.remove("loading");
        wrapper?.querySelector(selectors.select)?.classList.remove("hidden");
        wrapper?.querySelector(".pill-loader")?.removeAttribute("aria-busy");
      });
  }

  async function removeSellingPlan(
    variantId: string | undefined,
    wrapper: HTMLElement | null
  ) {
    if (variantId == null) {
      return;
    }

    wrapper?.classList.add("loading");
    wrapper?.querySelector(".pill-loader")?.setAttribute("aria-busy", "true");

    const rootPath = window.Shopify.routes.root ?? "/";

    fetch(rootPath + "cart.js")
      .then((response) => response.json())
      .then(async function (cart) {
        for (const item of cart.items) {
          if (String(item.variant_id) === variantId) {
            const sectionsToBundle = [];
            document.documentElement.dispatchEvent(
              new CustomEvent("cart:prepare-bundled-sections", {
                bubbles: true,
                detail: { sections: sectionsToBundle },
              })
            );
            const cartContent = await (
              await fetch(rootPath + "cart/change.js", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  id: item.key,
                  quantity: item.quantity,
                  selling_plan: null,
                  properties: {
                    ...item.properties,
                    _juo_subscribe_cart: null,
                  },
                  sections: sectionsToBundle,
                }),
              })
            ).json();

            reloadCart(cartContent);
          }
        }
      })
      .finally(() => {
        wrapper?.classList.remove("loading");
        wrapper?.querySelector(selectors.select)?.classList.add("hidden");
        wrapper?.querySelector(".pill-loader")?.removeAttribute("aria-busy");
      });
  }

  function reloadCart(cartContent) {
    document.documentElement.dispatchEvent(
      new CustomEvent("cart:change", {
        bubbles: true,
        detail: {
          baseEvent: "line-item:change",
          cart: cartContent,
        },
      })
    );
  }

  function main() {
    if (window.Shopify != null) {
      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        initializeSwitcher();
      } else {
        document.addEventListener("DOMContentLoaded", initializeSwitcher);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
