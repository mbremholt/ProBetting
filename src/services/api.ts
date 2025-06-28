import axios from 'axios';
import { MatchListData } from '../types/api';

const USE_PROXY = true; // Set to false to bypass the proxy

function getApiUrl(target: string) {
  if (USE_PROXY) {
    return `/api/proxy?target=${encodeURIComponent(target)}`;
  } else {
    return `https://24live.com/api/${target}`;
  }
}

export const fetchMatchListData = async (): Promise<MatchListData> => {
  try {
    // Get date range for the last 7 days and next 7 days
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 7); // 7 days ago
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 7); // 7 days from now
    toDate.setHours(23, 59, 59, 999);

    const response = await axios.get(getApiUrl('match-list-data/22'), {
      params: {
        lang: 'en',
        type: 'not_started',
        subtournamentIds: '70521,70503',
        sort: 'alpha',
        short: 0,
        from: fromDate.toISOString().slice(0, 19).replace('T', ' '),
        to: toDate.toISOString().slice(0, 19).replace('T', ' ')
      }
    });

    console.log('API Response:', response.data);
    
    // The API might return the array directly
    const matches = Array.isArray(response.data) ? response.data : response.data.matches || [];
    return { matches };
  } catch (error) {
    console.error('Error fetching match list data:', error);
    throw error;
  }
};

export const fetchH2H = async (matchId: number) => {
  const url = getApiUrl(`match/${matchId}`);
  const response = await axios.get(url, {
    params: {
      lang: 'en',
      short: 0,
      h2hlimit: 5,
    }
  });
  return response.data.h2h;
};