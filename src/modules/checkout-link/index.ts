import "./checkout-link.scss";
import { CartWatcher } from "./cartWatcher";

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
  const idealButtonSelector = "#juo-go-to-checkout-with-ideal";
  const cartFormSelector = "form[action*='/cart']";

  const myCartWatcher = new CartWatcher();

  const sellingPlansMap = new Map<string, number>();

  async function updateSellingPlansMap() {
    const button = document.querySelector(idealButtonSelector);
    if (!button) {
      return;
    }

    button.setAttribute("disabled", "disabled");

    sellingPlansMap.clear();
    const response = await fetch("/?section_id=juo-selling-plans");

    if (response.status !== 200) {
      console.error("Failed to load selling plans");
      return;
    }

    try {
      const el = document.createElement("div");
      el.innerHTML = await response.text();
      const parsed = JSON.parse(
        el.querySelector("template")?.innerHTML ?? "{}"
      );
      Object.entries(parsed).map(([key, value]) => {
        if (value != null) {
          sellingPlansMap.set(key, value as number);
        }
      });
    } catch (error) {
      console.error("Failed to load selling plans");
    }

    if (
      myCartWatcher
        .storedCart()
        .items.filter((item) => item.selling_plan_allocation).length ==
      sellingPlansMap.size
    ) {
      button.removeAttribute("disabled");
    }
  }

  function handleCartChange() {
    const form = document.querySelector(cartFormSelector);
    if (!form) {
      console.warn("No cart form found");
      return;
    }

    const cart = myCartWatcher.storedCart();
    const hasSellingPlan = cart.items.some(
      (item) => item.selling_plan_allocation
    );

    form.classList[hasSellingPlan ? "add" : "remove"]("has-selling-plan");

    if (hasSellingPlan) {
      updateSellingPlansMap();
    }
  }

  async function handleCheckoutLink() {
    myCartWatcher.init();
    document.addEventListener("click", switchCart);
    window.addEventListener("cart_changed", handleCartChange);
    updateSellingPlansMap();
  }

  async function switchCart(e) {
    if (e == null) {
      return;
    }
    const checkoutButton = (e?.target as HTMLElement).matches(
      idealButtonSelector
    )
      ? (e.target as HTMLElement)
      : null;

    if (checkoutButton == null) {
      return;
    }

    e.target.disabled = true;

    const cart = myCartWatcher.storedCart();

    const shouldSwitch = cart.items.some((item) => {
      if (item.selling_plan_allocation != null) {
        return sellingPlansMap.has(String(item.key));
      }
      return false;
    });

    if (!shouldSwitch) {
      window.location.href = "/checkout";
      return;
    }

    const toAdd = cart.items.map((item) => {
      const mappedSellingPlan =
        item.selling_plan_allocation != null
          ? sellingPlansMap.get(String(item.key))
          : null;

      return {
        id: item.variant_id,
        quantity: item.quantity,
        properties: {
          ...item.properties,
          ...(item.selling_plan_allocation != null && mappedSellingPlan != null
            ? {
                _selling_plan_id: String(
                  item.selling_plan_allocation.selling_plan.id
                ),
              }
            : {}),
        },
        ...(item.selling_plan_allocation != null
          ? {
              selling_plan:
                mappedSellingPlan != null
                  ? mappedSellingPlan
                  : String(item.selling_plan_allocation.selling_plan.id),
            }
          : {}),
      };
    });

    fetch(window.Shopify.routes.root + "cart/clear").then(async () => {
      try {
        const res = await fetch(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attributes: cart.attributes,
            items: toAdd,
          }),
        });

        setTimeout(() => {
          if (res.status !== 200) {
            throw new Error("Failed to add items to cart");
          }
          checkoutButton.removeAttribute("disabled");
          myCartWatcher.stop();
          window.location.href = "/checkout?skip_shop_pay=true";
        }, 100);
      } catch (error) {
        console.error(error);
        myCartWatcher.observeCartChanges();
      }
    });
  }

  async function revertCart() {
    const cart = await myCartWatcher.fetchCart();
    const shouldSwitch = cart.items.some((item) => {
      return (
        item.properties._selling_plan_id != null &&
        item.properties._selling_plan_id !== ""
      );
    });

    if (!shouldSwitch) {
      return;
    }

    const toAdd = cart.items.map((item) => {
      const hasIntent =
        item.properties._selling_plan_id != null &&
        item.properties._selling_plan_id !== "";

      return {
        id: item.variant_id,
        quantity: item.quantity,
        properties: {
          ...item.properties,
          ...(hasIntent
            ? {
                _selling_plan_id: "",
              }
            : {}),
        },
        ...(hasIntent
          ? {
              selling_plan: item.properties._selling_plan_id,
            }
          : {}),
      };
    });

    await fetch(window.Shopify.routes.root + "cart/clear");

    await fetch(window.Shopify.routes.root + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attributes: cart.attributes,
        items: toAdd,
      }),
    });
  }

  function init() {
    if (window.Shopify != null) {
      handleCheckoutLink();
      handleCartChange();
      revertCart();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", ({ persisted }) => {
    if (persisted) {
      revertCart();
      handleCartChange();
    }
  });
})();
