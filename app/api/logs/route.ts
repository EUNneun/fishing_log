import { desc, eq, isNull, or } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { fishingLogs } from "../../../db/schema";

const message = (error: unknown) => error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
const ORIGINAL_OWNER_EMAIL = process.env.ORIGINAL_OWNER_EMAIL;

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const ownRecords = ORIGINAL_OWNER_EMAIL && user.email === ORIGINAL_OWNER_EMAIL
      ? or(eq(fishingLogs.ownerEmail, user.email), isNull(fishingLogs.ownerEmail))
      : eq(fishingLogs.ownerEmail, user.email);
    const logs = await getDb().select().from(fishingLogs)
      .where(ownRecords)
      .orderBy(desc(fishingLogs.tripDate), desc(fishingLogs.id)).limit(100);
    return Response.json({ logs });
  } catch (error) { return Response.json({ error: message(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const p = await request.json() as Record<string, string>;
    for (const key of ["tripDate", "location", "boatName", "fee", "species", "rig", "weather", "catchCount"]) if (!String(p[key] ?? "").trim()) return Response.json({ error: "필수 항목을 확인해주세요." }, { status: 400 });
    const [log] = await getDb().insert(fishingLogs).values({ tripDate: p.tripDate, location: p.location.trim(), boatName: p.boatName.trim(), fee: Number(p.fee), species: p.species.trim(), rig: p.rig.trim(), weather: p.weather, catchCount: Number(p.catchCount), maxSize: p.maxSize ? Number(p.maxSize) : null, memo: p.memo?.trim() || "", ownerEmail: user.email }).returning();
    return Response.json({ log }, { status: 201 });
  } catch (error) { return Response.json({ error: message(error) }, { status: 500 }); }
}
