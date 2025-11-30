export async function sendSlackAlert(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not defined. Skipping alert.");
    return;
  }

  try {
    const payload = {
      text: `🚨 *Debt API Error*: ${message}`,
      username: "Debt Monitor",
      icon_emoji: ":warning:",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to send Slack alert: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error sending Slack alert:", error);
  }
}

