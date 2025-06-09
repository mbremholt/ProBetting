import axios from 'axios';
import { MatchListData } from '../types/api';

const API_URL = '/api/proxy?target=match-list-data/22';

export const fetchMatchListData = async (): Promise<MatchListData> => {
  try {
    const response = await axios.get(API_URL, {
      params: {
        lang: 'en',
        type: 'not_started',
        subtournamentIds: '70521,70503',
        sort: 'alpha',
        short: 0
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