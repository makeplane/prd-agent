export interface OAuthSuccessTemplateData {
  workspace_id: string;
  workspace_slug: string;
  app_installation_id: string;
  plane_base_url: string;
}

export function getOAuthSuccessTemplate(data: OAuthSuccessTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Bot - Connected</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #8b5cf6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            padding: 48px;
            max-width: 520px;
            width: 100%;
            text-align: center;
        }
        
        .success-icon {
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 28px;
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }
        
        .checkmark {
            width: 32px;
            height: 32px;
            color: white;
        }

        .weather-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        h1 {
            color: #1f2937;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        
        .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 32px;
            line-height: 1.6;
        }
        
        .details {
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
            text-align: left;
            border: 1px solid #e2e8f0;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            color: #64748b;
            font-weight: 500;
            font-size: 14px;
        }
        
        .detail-value {
            color: #1e293b;
            font-weight: 600;
            font-size: 13px;
            font-family: 'Monaco', 'Consolas', monospace;
            background: #e2e8f0;
            padding: 6px 10px;
            border-radius: 6px;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .plane-button {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border: none;
            padding: 16px 36px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s ease;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
        }
        
        .plane-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
        }
        
        .plane-button:active {
            transform: translateY(0);
        }

        .usage-hint {
            margin-top: 24px;
            padding: 16px;
            background: #fef3c7;
            border-radius: 12px;
            border: 1px solid #fcd34d;
        }

        .usage-hint p {
            color: #92400e;
            font-size: 14px;
            line-height: 1.5;
        }

        .usage-hint code {
            background: #fde68a;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="weather-icon">🌤️</div>
        <div class="success-icon">
            <svg class="checkmark" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
        </div>
        
        <h1>Weather Bot Connected!</h1>
        <p class="subtitle">Your Plane workspace is now connected to the Weather Bot. You can mention the bot in work item comments to get weather information.</p>
        
        <div class="details">
            <div class="detail-item">
                <span class="detail-label">Workspace ID</span>
                <span class="detail-value">${data.workspace_id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Workspace</span>
                <span class="detail-value">${data.workspace_slug}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Installation ID</span>
                <span class="detail-value">${data.app_installation_id}</span>
            </div>
        </div>

        <div class="usage-hint">
            <p>💡 <strong>How to use:</strong> Mention the Weather Bot in a work item comment and ask about the weather. For example: <code>@WeatherBot What's the weather in Tokyo?</code></p>
        </div>
        
        <a href="${data.plane_base_url}" class="plane-button" style="margin-top: 24px;">
            Go to Plane →
        </a>
    </div>
</body>
</html>`;
}

