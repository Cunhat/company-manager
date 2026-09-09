import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";

dayjs.extend(customParseFormat);
dayjs.extend(utc);

export function isTravelDate(value: string) {
  return dayjs(value, "YYYY-MM-DD", true).isValid();
}

export function isTravelMonth(value: string) {
  return dayjs(value, "YYYY-MM", true).isValid();
}

export default dayjs;
