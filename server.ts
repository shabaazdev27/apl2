import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // WebSocket logic for real-time scores
  const liveScores: Record<string, { id: string, teamA: string, teamB: string, scoreA: string, scoreB: string, time: string, status?: string }> = {
    '1': { id: '1', teamA: 'RCB', teamB: 'CSK', scoreA: '142/3 (15.2)', scoreB: '0/0 (0.0)', time: 'LIVE' }
  };

  const fetchRealScores = async () => {
    const apiKey = process.env.CRICKET_DATA_API_KEY;
    if (!apiKey) return;

    try {
      const response = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
      const data: any = await response.json();
      
      if (data.status === 'success' && data.data) {
        data.data.forEach((match: any) => {
          // Check if it's an IPL match or T20
          const isIPL = match.name?.toLowerCase().includes('ipl') || match.series_id === 'c7ec3043-f929-4c8d-8f03-556a433a4a85';
          
          if (isIPL || match.matchType === 't20') {
            // Map typical score strings
            let scoreA = '0/0 (0.0)';
            let scoreB = '0/0 (0.0)';
            
            if (match.score && match.score.length > 0) {
              scoreA = `${match.score[0].r}/${match.score[0].w} (${match.score[0].o})`;
              if (match.score.length > 1) {
                scoreB = `${match.score[1].r}/${match.score[1].w} (${match.score[1].o})`;
              }
            }

            // Extract team names from "Team A vs Team B"
            const teams = match.name?.split(' vs ') || [match.teams[0], match.teams[1]];
            const teamA = teams[0]?.trim() || "Team A";
            const teamB = teams[1]?.trim() || "Team B";

            liveScores[match.id] = {
              id: match.id,
              teamA,
              teamB,
              scoreA,
              scoreB,
              time: match.status?.includes('Starts') ? match.status : (match.ms === 'live' ? 'LIVE' : match.status),
              status: match.status
            };
          }
        });

        // Broadcast updates
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'REAL_SCORES_SYNC',
              scores: liveScores
            }));
          }
        });
      }
    } catch (err) {
      console.error("Error fetching real scores:", err);
    }
  };

  // Run real fetcher every 60 seconds if API key exists
  if (process.env.CRICKET_DATA_API_KEY) {
    setInterval(fetchRealScores, 60000);
    fetchRealScores();
  }

  setInterval(() => {
    // Keep simulation running if no real API key for testing
    if (!process.env.CRICKET_DATA_API_KEY && liveScores['1']) {
      const current = liveScores['1'].scoreA;
      const runs = parseInt(current.split('/')[0]);
      const wickets = parseInt(current.split('/')[1]);
      const overs = parseFloat(current.split('(')[1]);
      
      const nextRuns = runs + Math.floor(Math.random() * 4);
      const nextWickets = Math.random() > 0.95 ? wickets + 1 : wickets;
      const nextOvers = (overs + 0.1) > (Math.floor(overs) + 0.5) ? Math.floor(overs) + 1.0 : overs + 0.1;

      liveScores['1'] = {
        ...liveScores['1'],
        scoreA: `${nextRuns}/${nextWickets} (${nextOvers.toFixed(1)})`,
        scoreB: '0/0 (0.0)'
      };

      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'SCORE_UPDATE',
            matchId: '1',
            scoreA: liveScores['1'].scoreA,
            scoreB: liveScores['1'].scoreB
          }));
        }
      });
    }
  }, 3000);

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({
      type: 'INIT_SCORES',
      scores: liveScores
    }));
  });

  // Structured In-Memory Cache with TTL
  interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
  }
  const cache: Record<string, CacheEntry> = {};

  const getCachedData = (key: string) => {
    const entry = cache[key];
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      delete cache[key];
      return null;
    }
    return entry.data;
  };

  const setCachedData = (key: string, data: any, ttlHours: number = 2) => {
    cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttlHours * 60 * 60 * 1000
    };
  };

  // API Routes
  app.get("/api/matches", (req, res) => {
    res.json(Object.values(liveScores));
  });

  // AI Routes
  app.post("/api/ai/challenge", async (req, res) => {
    const { streak, xp, followedTeams, history } = req.body;
    const cacheKey = `challenge_${streak}_${Math.floor(xp / 100)}_${followedTeams?.join(",")}_${history?.length || 0}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
      const prompt = `You are an AI Match Centre host for an IPL tournament.
      The fan's current tournament status:
      - Streak: ${streak} days
      - XP: ${xp}
      - Followed Teams: ${followedTeams?.join(", ") || "None"}
      - Recent Activity: ${history ? JSON.stringify(history) : "No predictions yet"}

      Task: Generate a highly personalized "Match Day Challenge".
      
      Intelligence Analysis:
      1. Identify the "Favorite Team" by looking at followedTeams and prediction patterns in history.
      2. Identify "Prediction Bias" (e.g., do they always pick the home team? Do they always pick against a certain rival?).
      3. Challenge Level: Based on ${streak} streak, set it to: ${streak > 3 ? "ELITE" : "ROOKIE"}.

      Personalization Requirements:
      - If they favor RCB, the challenge TITLE and DESCRIPTION must involve RCB.
      - If they have a high streak, reward them with a "Legacy" badge and harder goal.
      - Use a "Witty Analyst" persona in the motivationQuote.

      Respond in JSON format.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              challengeTitle: { type: Type.STRING },
              challengeDescription: { type: Type.STRING },
              xpReward: { type: Type.NUMBER },
              personaBadge: { type: Type.STRING },
              motivationQuote: { type: Type.STRING }
            },
            required: ["challengeTitle", "challengeDescription", "xpReward", "personaBadge", "motivationQuote"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      setCachedData(cacheKey, data, 24); // Challenges valid for 24h
      res.json(data);
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        console.warn("Gemini Quota Exceeded. Using fallback for challenge.");
      } else {
        console.error("Gemini Error:", error);
      }
      res.json({
        challengeTitle: "The All-Rounder's Test",
        challengeDescription: "Predict both the winning team and the total number of sixes in the next game.",
        xpReward: 500,
        personaBadge: "Steadfast Supporter",
        motivationQuote: "The AI is calculating millions of possibilities. In the meantime, trust your gut!"
      });
    }
  });

  app.post("/api/ai/match-insight", async (req, res) => {
    const { teamA, teamB, followedTeams, scoreA, scoreB, time } = req.body;
    const isLive = time === 'LIVE';
    
    // For live matches, we include a condensed score in cache key to allow evolving commentary
    const scoreState = isLive ? `${scoreA?.split('(')[0]}_${scoreB?.split('(')[0]}` : 'PRE';
    const cacheKey = `insight_${teamA}_${teamB}_${followedTeams?.join(",")}_${scoreState}`;

    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
      const prompt = `Provide a strategic AI insight for an IPL match between ${teamA} and ${teamB}. 
      Match Status: ${time} ${isLive ? `| Current Score: ${teamA}: ${scoreA}, ${teamB}: ${scoreB}` : ''}
      The fan follows these teams: ${followedTeams?.join(", ") || "None"}. 
      
      Requirements:
      1. Key Battle: A high-tension title for a current match duel (e.g., "The Death Over Slog" or "Spin Chokehold").
      2. Analysis: 2 sentences on the tactical situation.
      3. Strategic Tip: A 1-sentence prediction or advice for the fan.
      4. Win Probabilities: Projections for both teams based on current score (sum to 1.0).
      5. Live AI Commentary: A raw, "broadcaster-style" 2-sentence update. If LIVE, focus heavily on recent MOMENTUM SHIFTS, run rate pressure, or key wickets. If NOT LIVE, create hype based on historical rivalry.
      
      Respond in JSON format.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keyBattle: { type: Type.STRING },
              strategicTip: { type: Type.STRING },
              winProbabilityA: { type: Type.NUMBER },
              winProbabilityB: { type: Type.NUMBER },
              liveCommentary: { type: Type.STRING }
            },
            required: ["keyBattle", "strategicTip", "winProbabilityA", "winProbabilityB", "liveCommentary"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      setCachedData(cacheKey, data, isLive ? 0.25 : 4); // Live match insights valid for 15 mins
      res.json(data);
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        console.warn("Gemini Quota Exceeded. Using fallback for insight.");
      } else {
        console.error("Gemini Insight Error:", error);
      }
      res.json({
        keyBattle: "Top Order vs. Powerplay Pacers",
        strategicTip: "The pitch looks balanced. Early wickets will be the deciding factor in the outcome.",
        winProbabilityA: 0.52,
        winProbabilityB: 0.48,
        liveCommentary: "The stadium is electric! Both teams look focused and ready for a high-stakes encounter."
      });
    }
  });

  app.post("/api/team-news", async (req, res) => {
    const { teams } = req.body;
    if (!teams || teams.length === 0) return res.json({ news: [] });

    const cacheKey = `news_${teams.sort().join(",")}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
      const prompt = `Generate 4 high-energy "Team Dispatch" updates for these IPL teams: ${teams.join(", ")}. 
      Include a mix of:
      - 1 "Tactical Alert" (injury rumors or strategy shifts)
      - 2 "Social Buzz" items (viral training videos, player interactions, or fan-driven trends)
      - 1 "Stadium Feed" (atmosphere reports or ticket energy)
      
      Requirements:
      - Title: Punchy, tabloid-style headline.
      - Snippet: 2-sentence update with insider "leaked" flavor.
      - Source: e.g., "Insider @ Training", "Viral Feed", "Official Dispatch".
      
      Respond in JSON with a "news" array. Each item: { "id", "team", "title", "snippet", "source", "timestamp", "tags" }.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              news: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    team: { type: Type.STRING },
                    title: { type: Type.STRING },
                    snippet: { type: Type.STRING },
                    source: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "team", "title", "snippet", "source", "timestamp", "tags"]
                }
              }
            }
          }
        }
      });
      
      const data = JSON.parse(result.text || '{"news": []}');
      setCachedData(cacheKey, data, 1); // News valid for 1h
      res.json(data);
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        console.warn("Gemini Quota Exceeded. Using fallback dispatches.");
      } else {
        console.error("News Fetch Error:", error);
      }
      
      // Dynamic fallback based on requested teams
      const fallbackNews = teams.flatMap((team: string, idx: number) => [
        {
          id: `fb-${team}-${idx}`,
          team: team,
          title: "Net Practice Intensity Peaks",
          snippet: `The ${team} camp is buzzing with high-intensity drills. Captain's meeting just concluded with a focus on middle-overs strategy.`,
          source: "Team Insider",
          timestamp: "10m ago",
          tags: ["Practice", "Strategy", "IPL2024"]
        },
        {
          id: `fb-social-${team}-${idx}`,
          team: team,
          title: "Fan Interaction Milestone",
          snippet: `Exclusive: ${team} just crossed a massive social media milestone. The team thanked global fans for their unwavering support.`,
          source: "Social Buzz",
          timestamp: "2h ago",
          tags: ["Fans", "Viral", "CricketFamily"]
        }
      ]).slice(0, 4);

      const fallbackData = { news: fallbackNews };
      setCachedData(cacheKey, fallbackData, 0.5); // Fallback shorter TTL
      res.json(fallbackData);
    }
  });

  app.post("/api/ai/post-match", async (req, res) => {
    const { teamA, teamB, winner, predictedByFan, scoreA, scoreB } = req.body;
    const cacheKey = `postMatch_${teamA}_${teamB}_${winner}_${predictedByFan}_${scoreA}_${scoreB}`;

    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
      const prompt = `Match Ended! ${teamA} vs ${teamB}. 
      Final Scores: ${teamA}: ${scoreA}, ${teamB}: ${scoreB}.
      Winner: ${winner}. 
      Fan Predicted: ${predictedByFan}.
      
      Requirements:
      1. Match Reaction: A 1-sentence witty or hyped reaction to the result/fan's prediction.
      2. Match Summary: A 3-sentence punchy narrative highlighting the turning point, a standout player performance (can be hypothetical/generic based on teams if real data is sparse), and the final vibe.
      
      Respond in JSON format.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reaction: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ["reaction", "summary"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      setCachedData(cacheKey, data, 168); // Reactions and summaries valid for 1 week
      res.json(data);
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        console.warn("Gemini Quota Exceeded. Using fallback for post-match.");
      } else {
        console.error("Gemini Post-Match Error:", error);
      }
      res.json({
        reaction: "What a game! Even the AI is speechless. Great prediction effort!",
        summary: `The clash between ${teamA} and ${teamB} lived up to the hype. ${winner} showcased superior tactical discipline in the final overs to secure the win. A truly memorable performance that will be talked about all season.`
      });
    }
  });

  app.post("/api/ai/streak-analysis", async (req, res) => {
    const { streak } = req.body;
    const cacheKey = `streak_${streak}`;

    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
      const prompt = `The user has a prediction streak of ${streak} days. Analyze focus and give multiplier. Respond in JSON.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rewardTitle: { type: Type.STRING },
              rewardDescription: { type: Type.STRING },
              multiplier: { type: Type.NUMBER },
              aiCommentary: { type: Type.STRING }
            },
            required: ["rewardTitle", "rewardDescription", "multiplier", "aiCommentary"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      setCachedData(cacheKey, data, 12); // Streak analysis valid for 12h
      res.json(data);
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        console.warn("Gemini Quota Exceeded. Using fallback for streak analysis.");
      } else {
        console.error("Streak Analysis Error:", error);
      }
      res.json({
        rewardTitle: "Consistent Predictor",
        rewardDescription: "Your focus is sharp. Keep the streak alive for even bigger multipliers!",
        multiplier: 1.2,
        aiCommentary: "Reliability is the hallmark of a true champion."
      });
    }
  });

  app.get("/api/leaderboard", (req, res) => {
    // Simulated BigQuery / Redis result
    const leaderboard = [
      { name: "ViratFan_18", points: 4500, rank: 1, avatar: "🦁" },
      { name: "DhoniMagic", points: 4200, rank: 2, avatar: "⚔️" },
      { name: "HitmanRO", points: 3900, rank: 3, avatar: "🔥" },
      { name: "SkyHigh", points: 3850, rank: 4, avatar: "🦅" },
      { name: "GillPower", points: 3700, rank: 5, avatar: "🐯" },
    ];
    res.json(leaderboard);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
