export async function GET() {
  const val = process.env.STEERING_SYNC_SECRET || ''
  return Response.json({ set: !!val, length: val.length, prefix: val.slice(0,6) })
}
