export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const userLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";

    const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
    };

    return new Intl.DateTimeFormat(userLocale, options).format(date);
}
