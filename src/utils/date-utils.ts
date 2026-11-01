/**
 * 站点展示时间统一使用固定时区。
 *
 * 构建机时区可能是 UTC（CI）也可能是任何本地时区，直接使用 Date 的本地方法
 * 会导致「同一篇文章在不同机器上显示的日期/时间不同」。这里把展示时区与
 * 内容里的时间解耦：内容仍可写 +08:00 偏移，展示时统一换算到站点时区。
 */
export const SITE_TIME_ZONE = "Asia/Shanghai";

function partsToRecord(date: Date, options: Intl.DateTimeFormatOptions) {
	const formatter = new Intl.DateTimeFormat("zh-CN", {
		...options,
		timeZone: SITE_TIME_ZONE,
	});
	const record: Record<string, string> = {};
	for (const part of formatter.formatToParts(date)) {
		if (part.type !== "literal") record[part.type] = part.value;
	}
	return record;
}

/** YYYY-MM-DD，用于文章元信息与结构化数据 */
export function formatDateToYYYYMMDD(date: Date): string {
	const { year, month, day } = partsToRecord(date, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return `${year}-${month}-${day}`;
}

/** MM-DD，用于归档时间轴 */
export function formatMonthDay(date: Date): string {
	const { month, day } = partsToRecord(date, {
		month: "2-digit",
		day: "2-digit",
	});
	return `${month}-${day}`;
}

/** 站点时区下的年份，用于归档分组 */
export function getSiteYear(date: Date): number {
	const { year } = partsToRecord(date, { year: "numeric" });
	return Number(year);
}

/** YYYY-MM-DD HH:mm，用于说说 */
export function formatDateTime(date: Date): string {
	const { year, month, day, hour, minute } = partsToRecord(date, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	return `${year}-${month}-${day} ${hour}:${minute}`;
}
