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

(async function () {
  const isCart = window.location.href.includes("/cart");

  const idealButtonSelector = "#juo-go-to-checkout-with-ideal"; //Internal, fixed value
  const defaultCartButtonContentSelector = "juo-cart-default-button"; //Internal, fixed value

  // Replace with correct selector - theme specific
  const defaultButtonSelector = isCart
    ? " .cart__checkout-button"
    : ".rebuy-cart__checkout-button";
  const cartActionsSelector = isCart
    ? ".cart__ctas"
    : "[data-rebuy-component='checkout-area']"; // Wrapper which includes button above

  //This is optional, some cart apps provide functionality to upgrade cart item into subscription
  const cartItemSellingPlansSelector = null; // null | selector string, e.g. Rebuy usage: "#rebuy-cart .rebuy-cart__flyout-item-subscription option[value$=' ']";
  const iconsSelector = null; // null | selector string, e.g. Rebuy usage: ".rebuy-cart__payment-icons";

  let isInitialized = false;
  let currentCartButtonContent = "";

  const myCartWatcher = new CartWatcher();

  const sellingPlansMap = new Map<string, number>();

  async function updateSellingPlansMap() {
    const button = document.querySelector(idealButtonSelector);
    if (button) {
      button.setAttribute("disabled", "disabled");
    }

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
      if (button) {
        button.removeAttribute("disabled");
      }
    }
  }

  async function addCheckoutLink() {
    myCartWatcher.init();

    const cart = isInitialized
      ? myCartWatcher.storedCart()
      : await myCartWatcher.fetchCart();

    const hasSellingPlan = cart.items.some(
      (item) => item.selling_plan_allocation != null
    );

    const hasPrepaid =
      hasSellingPlan &&
      cart.items.some((item) => {
        const [planOption] =
          item.selling_plan_allocation?.selling_plan.options ?? [];
        if (planOption == null) {
          return false;
        }

        const options = planOption.value.split(";");

        const df = options.at(0)?.split(" ").at(0)?.replace("df:", "");
        const bf = options.at(1)?.split(" ").at(0)?.replace("bf:", "");

        return df && bf && Number.parseInt(df, 10) !== Number.parseInt(bf, 10);
      });

    if (hasPrepaid) {
      if (document.querySelector(idealButtonSelector) != null) {
        document.querySelector(idealButtonSelector)?.remove();
      }
      return;
    }

    if (hasSellingPlan) {
      await updateSellingPlansMap();
    }

    const defaultButton = document.querySelector(
      defaultButtonSelector
    ) as HTMLElement;

    const cartPaymentIcons =
      iconsSelector != null
        ? document.querySelector<HTMLElement>(iconsSelector)
        : null;

    if (!hasSellingPlan) {
      const wrapper = document.querySelector(
        ".juo-ideal-checkout-link-wrapper"
      );
      if (wrapper != null) {
        wrapper.remove();

        if (defaultButton != null) {
          defaultButton.innerHTML = currentCartButtonContent;
          defaultButton.classList.remove("juo-adjustments");
        }
        if (cartPaymentIcons != null) {
          cartPaymentIcons.classList.remove("hidden");
        }
      }
      return;
    }

    if (document.querySelector(idealButtonSelector) != null) {
      return;
    }

    if (defaultButton == null) {
      return;
    }

    if (!isInitialized) {
      currentCartButtonContent = defaultButton.innerHTML;
    }

    const defaultCheckoutButtonWrapper = defaultButton.closest(
      cartActionsSelector
    ) as HTMLElement;

    const buttonTemplate = document.getElementById("juo-ideal-checkout-link");
    const defaultCartButtonContentTemplate = document.getElementById(
      defaultCartButtonContentSelector
    );

    if (buttonTemplate == null || defaultCheckoutButtonWrapper == null) {
      return;
    }

    if (defaultCartButtonContentTemplate != null) {
      defaultButton.innerHTML = defaultCartButtonContentTemplate.innerHTML;
      defaultButton.classList.add("juo-adjustments");
    }

    if (cartPaymentIcons != null) {
      cartPaymentIcons.classList.add("hidden");
    }

    const buttonWrapper = document.createElement("div");

    buttonWrapper.classList.add("juo-ideal-checkout-link-wrapper");
    buttonWrapper.innerHTML = buttonTemplate.innerHTML;

    defaultCheckoutButtonWrapper.insertBefore(buttonWrapper, defaultButton);

    const idealButton = buttonWrapper.querySelector("button") as HTMLElement;
    const defaultButtonInner = defaultButton.querySelector(
      "span"
    ) as HTMLElement;

    if (defaultButtonInner != null && idealButton.dataset.ccLabel != null) {
      defaultButtonInner.innerText = idealButton.dataset.ccLabel;
    }

    if (cartItemSellingPlansSelector != null) {
      document
        .querySelectorAll<HTMLSelectElement>(cartItemSellingPlansSelector)
        .forEach((option) => {
          option.remove();
        });
    }

    idealButton.addEventListener("click", switchCart);

    isInitialized = true;
  }

  async function switchCart(e) {
    e.target.disabled = true;

    const checkoutButton = (e?.target as HTMLElement).matches(
      idealButtonSelector
    )
      ? (e.target as HTMLElement)
      : null;

    if (checkoutButton == null) {
      return;
    }

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

  async function init() {
    if (window.Shopify != null) {
      // eslint-disable-next-line no-inner-declarations

      await updateSellingPlansMap();
      const defaultButton = document.querySelector(
        defaultButtonSelector
      ) as HTMLElement;
      if (defaultButton != null) {
        currentCartButtonContent = defaultButton.innerHTML;
      }

      const config = { childList: true, subtree: true };

      const callback = async (_mutationList, observer) => {
        if (document.querySelector(cartActionsSelector) != null) {
          observer.disconnect();
          await addCheckoutLink();
        }
      };

      const observer = new MutationObserver(callback);

      observer.observe(document.body, config);

      window.addEventListener("cart_changed", async () => {
        await updateSellingPlansMap();
        await addCheckoutLink();
      });
      setTimeout(async () => {
        await revertCart();
      }, 1000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    await init();
  }

  window.addEventListener("pageshow", ({ persisted }) => {
    if (persisted) {
      revertCart();
      addCheckoutLink();
    }
  });
})();
