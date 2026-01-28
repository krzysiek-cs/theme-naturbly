/* eslint-disable @typescript-eslint/no-explicit-any */
export function formatMoney(cents: string | number, format?: string) {
  if (typeof cents == "string") {
    cents = cents.replace(".", "");
  }
  let value: string = "";
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || "${{amount}}";

  function defaultOption(opt: string | any, def: any) {
    return typeof opt == "undefined" ? def : opt;
  }

  function formatWithDelimiters(
    number: any,
    precision: number,
    thousands?: string,
    decimal?: string
  ) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ",");
    decimal = defaultOption(decimal, ".");

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split(".");
    const dollars = parts[0].replace(
      /(\d)(?=(\d\d\d)+(?!\d))/g,
      "$1" + thousands
    );
    const cents = parts[1] ? decimal + parts[1] : "";

    return dollars + cents;
  }

  switch (formatString.match(placeholderRegex)![1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
    case "amount_with_apostrophe_separator":
      value = formatWithDelimiters(cents, 2, "'", ".");
      break;
  }

  return formatString.replace(placeholderRegex, value);
}
