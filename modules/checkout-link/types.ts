declare global {
  interface Window {
    Shopify: {
      routes: {
        root: string;
      };
    };
  }
}

export interface ShopifyError {
  readonly status: number;
  readonly message: "Cart Error";
  readonly description: string;
}
export class InventoryError implements ShopifyError {
  readonly status = 422;
  readonly message = "Cart Error";
  description: string;
  constructor(description: string) {
    this.description = description;
  }
}
export class VariantError implements ShopifyError {
  readonly status = 404;
  readonly message = "Cart Error";
  readonly description = "Cannot find variant";
}

/**
 * Shopify cart attributes
 * https://shopify.dev/docs/themes/liquid/reference/objects/cart#cart-attributes
 */
export type Attributes = {
  [index: string]: string;
};

export type CartLevelDiscountApplications = {
  readonly type: string;
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly created_at: string;
  readonly value_type: string;
  readonly allocation_method: string;
  readonly target_selection: string;
  readonly target_type: string;
  readonly total_allocated_amount: number;
};

export type CartState = {
  readonly token: string;
  readonly note: string;
  readonly attributes: Attributes;
  readonly total_price: number;
  readonly total_weight: number;
  readonly item_count: number;
  readonly items: CartLineItem[];
  readonly requires_shipping: boolean;
  readonly currency: string;
  readonly items_subtotal_price: number;
  readonly original_total_price: number;
  readonly total_discount: number;
  readonly cart_level_discount_applications: CartLevelDiscountApplications[];
};

/**
 * Cart line_item object
 * https://shopify.dev/docs/themes/liquid/reference/objects/line_item/
 */
export type CartLineItem = {
  readonly id: number;
  readonly quantity: number;
  readonly variant_id: number;
  readonly key: string;
  readonly title: string;
  readonly price: number;
  readonly line_price: number;
  readonly final_price: number;
  readonly final_line_price: number;
  readonly sku: string;
  readonly grams: number;
  readonly vendor: string;
  readonly taxable: boolean;
  readonly product_id: number;
  readonly product_has_only_default_variant: boolean;
  readonly properties: LineItemProperties;
  readonly gift_card: boolean;
  readonly url: string;
  readonly featured_image: FeaturedImage;
  readonly image: string;
  readonly handle: string;
  readonly requires_shipping: boolean;
  readonly product_title: string;
  readonly product_description: string;
  readonly product_type: string;
  readonly variant_title: string;
  readonly variant_options: string[];
  readonly options_with_values: OptionsWithValues[];
  readonly line_level_discount_allocations?: LineLevelDiscountAllocation[];
  readonly selling_plan_allocation?: SellingPlanAllocation;
};

export type FeaturedImage = {
  readonly url: string;
  readonly aspect_ratio: number;
  readonly alt: string;
};

export type OptionsWithValues = {
  readonly name: string;
  readonly value: string;
};

export type LineLevelDiscountAllocation = {
  amount: number;
  discount_application: DiscountApplication;
};

export type DiscountApplication = {
  type: string;
  key: string;
  title: string;
  description: null;
  value: string;
  created_at: string;
  value_type: string;
  allocation_method: string;
  target_selection: string;
  target_type: string;
  total_allocated_amount: number;
};

export type CartItemsResponse = { items: CartLineItem[] };

/**
 * The id value is the line item's variant_id or the line item's key.
 * @see {@link https://shopify.dev/docs/themes/liquid/reference/objects/line_item#line_item-variant_id | ShopifyAPI: variant_id }
 */
export declare type VariantID = number | string;

/**
 * An array of custom information for an item that has been added to the cart.
 * @see {@link https://shopify.dev/docs/themes/liquid/reference/objects/line_item/#line_item-properties | ShopifyAPI: line_item.properties }
 */
export declare type LineItemProperties = {
  [index: string]: string;
};

export type ShopifyResponse = CartState | CartItemsResponse | ShopifyError;

export declare type CartItemAdd = {
  id: VariantID;
  quantity?: number;
  properties?: LineItemProperties;
};

export type Product = {
  productId: string;
  variantId: string;
  imageURL: string;
  title: string;
  variantTitle: string;
  description?: string;
  price: number;
  sellingPlanAllocations: SellingPlanAllocation[];
  images: string[];
  hasOnlyDefaultVariant: boolean;
};

export type SellingPlanAllocation = {
  price_adjustments: {
    position: number;
    price: number;
  }[];
  price: number;
  compare_at_price: number;
  per_delivery_price: number;
  selling_plan: CartItemSellingPlanAllocationPlan;
};

type CartItemSellingPlanAllocationPlan = {
  id: number;
  name: string;
  description: string | null;
  options: {
    name: string;
    position: number;
    value: string; // Can be further parsed into a structured type if needed
  }[];
  recurring_deliveries: boolean;
  fixed_selling_plan: boolean;
  price_adjustments: {
    order_count: number | null;
    position: number;
    value_type: "percentage" | "fixed"; // Assuming it only has these two values
    value: number;
  }[];
};

export type CartItemSellingPlanAllocation = {
  price_adjustments: {
    position: number;
    price: number;
  }[];
  price: number;
  compare_at_price: number;
  per_delivery_price: number;
};

export type ParsedJuoSellingPlanOption = {
  df: string; // "3 MONTH",
  bf: string; // "12 MONTH",
  pricingPolicy: [
    {
      type: "fixed";
      adjustment: {
        type: "percentage";
        value: 20;
      };
    }
  ];
  minRenewals?: number;
};
