import { getHolidayPreset } from "@hyunbinseo/holidays-kr";

export async function GET(request: Request) {
  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2018 || year > 2027) {
    return Response.json({ error: "조회 가능한 연도가 아닙니다." }, { status: 400 });
  }
  const preset = await getHolidayPreset(String(year));
  const holidays = Object.fromEntries(Object.entries(preset).map(([date, names]) => [date, names.join(", ")]));
  return Response.json({ holidays });
}
