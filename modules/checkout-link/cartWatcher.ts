import {
  type CartState,
  InventoryError,
  VariantError,
  type ShopifyResponse,
} from "./types";

export class CartWatcher {
  private cartObserver: PerformanceObserver;

  init() {
    this.emitCartChanges().then(() => {
      this.observeCartChanges();
    });
  }

  checkResponse(response: ShopifyResponse): CartState {
    if (response["status"] === 404) {
      throw new VariantError();
    }
    if (response["status"] === 422) {
      throw new InventoryError(response["description"]);
    }
    if (response["token"]) {
      return response as CartState;
    }
    throw new Error("No token provided in the Shopify Cart response");
  }

  async fetchCart() {
    const response = await fetch("/cart.js", {
      headers: {
        cache: "no-store",
      },
    });
    const data = (await response.json()) as unknown as ShopifyResponse;
    return this.checkResponse(data);
  }

  storeCart(cart) {
    localStorage.setItem("juo-cart", JSON.stringify(cart));
  }

  storedCart(): CartState {
    const cart = localStorage.getItem("juo-cart");
    return cart != null ? JSON.parse(cart) : { items: [] };
  }

  findCartChanges(oldCart: CartState, newCart: CartState) {
    const onlyInLeft = (l: CartState["items"], r: CartState["items"]) =>
      l.filter((li) => !r.some((ri) => li.key == ri.key));
    const result = {
      added: onlyInLeft(newCart.items, oldCart.items),
      removed: onlyInLeft(oldCart.items, newCart.items),
    };

    oldCart.items.forEach((oi) => {
      const ni = newCart.items.find(
        (i) => i.key == oi.key && i.quantity != oi.quantity
      );
      if (!ni) return;
      const quantity = ni.quantity - oi.quantity;
      const item = { ...ni };
      item.quantity = Math.abs(quantity);
      quantity > 0 ? result.added.push(item) : result.removed.push(item);
    });

    return result;
  }

  async emitCartChanges() {
    const newCart = await this.fetchCart();
    const oldCart = this.storedCart();
    const changes = this.findCartChanges(oldCart, newCart);

    if (changes.added.length > 0 || changes.removed.length > 0) {
      const event = new CustomEvent("cart_changed", { detail: changes });

      this.storeCart(newCart);
      window.dispatchEvent(event);
    }
  }

  observeCartChanges() {
    this.cartObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const isValidRequestType = ["xmlhttprequest", "fetch"].includes(
          // @ts-expect-error Incorrect typing
          entry.initiatorType
        );

        const isCartChangeRequest = /\/cart\//.test(entry.name);
        if (isValidRequestType && isCartChangeRequest) {
          this.emitCartChanges();
        }
      });
    });
    this.cartObserver.observe({ entryTypes: ["resource"] });
  }
  stop() {
    this.cartObserver.disconnect();
  }
}
