import twilio from 'twilio'

const { VoiceResponse } = twilio.twiml

export default function handler(req, res) {
  const response = new VoiceResponse()
  const dial = response.dial()
  dial.client('claw-dispatcher')

  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.send(response.toString())
}
