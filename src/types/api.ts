export interface Period {
  name: string;
  trans_name: string;
  period: number;
  home_team: number | null;
  home_team_points: number | null;
  away_team: number | null;
  away_team_points: number | null;
}

export interface Score {
  periods_count: number;
  home_team: number | null;
  away_team: number | null;
  home_text: string | null;
  away_text: string | null;
  home_aggregate: number | null;
  away_aggregate: number | null;
  home_team_normal_time: number | null;
  away_team_normal_time: number | null;
  run_rate: number | null;
  required_run_rate: number | null;
  home_extra_info: any[];
  away_extra_info: any[];
  periods: Period[];
  series_score: any[];
  hide_last_period: boolean;
  show_dashes: boolean;
}

export interface Participant {
  id: number;
  type: string;
  image: string;
  countryImage: string | null;
  name: string;
  name_short: string;
  scratch: boolean;
  cuptree_is_final: boolean;
  tennis_tournament_info: any;
  lineup_string: string | null;
  bench_string: string | null;
  red_cards: number;
  table_position: number | null;
  seed: number | null;
  bracket_number: number | null;
}

export interface Match {
  id: number;
  code_state: string;
  match_state: string;
  minute: number | null;
  time_paused: boolean;
  last_time_update: string | null;
  stoppage_time_announced: string | null;
  isLive: boolean;
  added_time: string | null;
  last_update: string | null;
  modified: number;
  finished: number | null;
  is_favorited: boolean;
  score: Score;
  winner: number;
  aggregate_winner: number;
  toss_won_by: string | null;
  toss_decision: string | null;
  innings: any;
  tracker: any;
  category_id: number;
  category_name: string;
  tournament_id: number;
  tournament_country: string | null;
  tournament_country_iso: string | null;
  tournament_country_iso3: string | null;
  sub_tournament_id: number;
  sub_tournament_name: string;
  sub_tournament_city: string | null;
  sub_tournament_qualifying: number;
  sub_tournament_ground: string | null;
  singles_doubles: string | null;
  season_id: number;
  start_date: string;
  round: string | null;
  round_name: string | null;
  period_length: number | null;
  display_time: boolean;
  display_period_time: boolean;
  hasTable: boolean;
  info: string | null;
  participants: Participant[];
}

export interface MatchListData {
  matches: Match[];
}

export interface TournamentData {
  tournament_id: number;
  tournament_name: string;
  season_name: string;
  data: {
    live: Match[];
    finished: Match[];
  };
} 