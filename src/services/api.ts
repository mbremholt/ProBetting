import axios from 'axios';
import { MatchListData } from '../types/api';

const API_URL = '/api/proxy?target=match-list-data/22';

export const fetchMatchListData = async (): Promise<MatchListData> => {
  try {
    // Get today's date and format it
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);

    const response = await axios.get(API_URL, {
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
  const url = `/api/proxy?target=match/${matchId}`;
  const response = await axios.get(url, {
    params: {
      lang: 'en',
      short: 0,
      h2hlimit: 5,
    }
  });
  return response.data.h2h;
};