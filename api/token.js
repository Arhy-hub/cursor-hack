import twilio from 'twilio'

const { AccessToken } = twilio.jwt
const { VoiceGrant } = AccessToken

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
    return res.status(500).json({ error: 'Twilio credentials not configured' })
  }

  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
    identity: 'claw-dispatcher',
    ttl: 3600
  })

  token.addGrant(new VoiceGrant({ incomingAllow: true }))

  res.json({ token: token.toJwt() })
}
