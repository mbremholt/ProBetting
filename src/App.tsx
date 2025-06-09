import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Box,
  Chip,
  createTheme,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import { fetchMatchListData, fetchH2H } from './services/api';
import { Match } from './types/api';
import { keyframes } from '@mui/system';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1db954' }, // Spotify green
    secondary: { main: '#191414' }, // Spotify dark background
    background: { default: '#191414', paper: '#222326' },
    text: { primary: '#fff', secondary: '#b3b3b3' },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: 'Montserrat, "Circular", "Roboto", Arial, sans-serif',
    h4: { fontWeight: 800, letterSpacing: 1 },
    h5: { fontWeight: 700 },
  },
});

// Add a shake animation
const shake = keyframes`
  0% { transform: rotate(-2deg) scale(1.05); }
  20% { transform: rotate(2deg) scale(1.1); }
  40% { transform: rotate(-2deg) scale(1.08); }
  60% { transform: rotate(2deg) scale(1.12); }
  80% { transform: rotate(-2deg) scale(1.09); }
  100% { transform: rotate(0deg) scale(1.1); }
`;

function normalizeName(name: string | undefined) {
  return (name || '').replace(/\./g, '').trim().toLowerCase();
}

function isTodayUTC(dateString: string) {
  const matchDate = new Date(dateString);
  const now = new Date();

  return (
    matchDate.getUTCFullYear() === now.getUTCFullYear() &&
    matchDate.getUTCMonth() === now.getUTCMonth() &&
    matchDate.getUTCDate() === now.getUTCDate()
  );
}

function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [h2hSummary, setH2hSummary] = useState<{ [key: number]: { aWins: number, bWins: number, aLosses: number, bLosses: number } }>({});
  const [h2hResultsById, setH2hResultsById] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchMatchListData();
        setMatches(data.matches || []);

        // Fetch H2H for each match in parallel
        const h2hResults = await Promise.all(
          (data.matches || []).map(async (match) => {
            const h2h = await fetchH2H(match.id);
            return { matchId: match.id, h2h };
          })
        );

        // Analyze H2H for each match
        const summary: { [key: number]: { aWins: number, bWins: number, aLosses: number, bLosses: number } } = {};
        for (const { matchId, h2h } of h2hResults) {
          const match = data.matches.find((m) => m.id === matchId);
          const home = normalizeName(match?.participants.find((p) => p.type === 'home_team')?.name_short);
          const away = normalizeName(match?.participants.find((p) => p.type === 'away_team')?.name_short);

          console.log(`\nAnalyzing matchId: ${matchId}`);
          console.log('Home:', home, 'Away:', away);
          console.log('Raw H2H:', h2h);

          let aWins = 0, bWins = 0, aLosses = 0, bLosses = 0;
          const h2hMatches = h2h?.total?.h2h || [];
          for (const h2hMatch of h2hMatches) {
            const h2hHome = normalizeName(h2hMatch.home_team);
            const h2hAway = normalizeName(h2hMatch.away_team);
            console.log('  H2H Match:', h2hMatch.home_team, 'vs', h2hMatch.away_team, '|', h2hMatch.score.home_team, '-', h2hMatch.score.away_team);
            if (h2hHome === home && h2hMatch.score.home_team > h2hMatch.score.away_team) {
              aWins++;
              console.log('    aWins++');
            }
            if (h2hAway === home && h2hMatch.score.away_team > h2hMatch.score.home_team) {
              aWins++;
              console.log('    aWins++ (away)');
            }
            if (h2hHome === away && h2hMatch.score.home_team > h2hMatch.score.away_team) {
              bWins++;
              console.log('    bWins++');
            }
            if (h2hAway === away && h2hMatch.score.away_team > h2hMatch.score.home_team) {
              bWins++;
              console.log('    bWins++ (away)');
            }
          }
          aLosses = bWins;
          bLosses = aWins;
          console.log('Summary:', { aWins, bWins, aLosses, bLosses });
          summary[matchId] = { aWins, bWins, aLosses, bLosses };
        }
        setH2hSummary(summary);

        // Store raw H2H data
        const h2hResultsMap: { [key: number]: any } = {};
        for (const { matchId, h2h } of h2hResults) {
          h2hResultsMap[matchId] = h2h;
        }
        setH2hResultsById(h2hResultsMap);

      } catch (err) {
        setError('Failed to load match data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const isGoodBet = (h2h: any, aForm: string, bForm: string) => {
    if (!h2h) return false;
    
    // Calculate win rates
    const aWinRate = h2h.aWins / (h2h.aWins + h2h.aLosses);
    const bWinRate = h2h.bWins / (h2h.bWins + h2h.bLosses);
    
    // Count recent wins from form
    const aRecentWins = (aForm.match(/✔️/g) || []).length;
    const bRecentWins = (bForm.match(/✔️/g) || []).length;
    
    // Consider it a good bet if:
    // 1. One team has significantly better H2H record (>60% win rate)
    // 2. AND that team has good recent form (at least 3 wins in last 5)
    return (aWinRate > 0.6 && aRecentWins >= 3) || (bWinRate > 0.6 && bRecentWins >= 3);
  };

  const renderMatchRow = (match: Match, index: number) => {
    const homeTeam = match.participants.find(p => p.type === 'home_team');
    const awayTeam = match.participants.find(p => p.type === 'away_team');
    const h2h = h2hSummary[match.id];
    const h2hRaw = h2hResultsById[match.id];

    // Get last 5 matches for each player (all time)
    const last5A = (h2hRaw?.total?.home_team || []).slice(0, 5);
    const last5B = (h2hRaw?.total?.away_team || []).slice(0, 5);

    // Get today's matches for each player
    const todayMatchesA = (h2hRaw?.total?.home_team || []).filter((m: any) => isTodayUTC(m.date)).slice(0, 5);
    const todayMatchesB = (h2hRaw?.total?.away_team || []).filter((m: any) => isTodayUTC(m.date)).slice(0, 5);

    const aForm = todayMatchesA.length > 0
      ? todayMatchesA.map((m: any) => (m.badge === 'W' ? '✓' : '❌')).join(' ')
      : '-';
    const bForm = todayMatchesB.length > 0
      ? todayMatchesB.map((m: any) => (m.badge === 'W' ? '✓' : '❌')).join(' ')
      : '-';

    const goodBet = isGoodBet(h2h, aForm, bForm);

    return (
      <TableRow
        key={match.id}
        sx={{
          '&:hover': {
            background: 'linear-gradient(90deg, #232323 0%, #1db95411 100%)',
            boxShadow: '0 0 8px 1px #1db95422',
            zIndex: 1,
          },
          backgroundColor: (index % 2 === 0) ? '#232323' : '#191414',
          transition: 'background 0.3s, box-shadow 0.3s',
        }}
      >
        <TableCell>{new Date(match.start_date).toLocaleString()}</TableCell>
        <TableCell>
          <Box display="inline-flex" alignItems="center" gap={1}>
            {homeTeam?.name}
            {goodBet && (
              <Chip 
                label="Good Bet" 
                size="small" 
                sx={{ 
                  bgcolor: '#1db954',
                  color: 'white',
                  fontWeight: 'bold',
                  animation: `${shake} 0.5s ease-in-out`,
                  borderRadius: 0,
                }} 
              />
            )}
          </Box>
        </TableCell>
        <TableCell><Box display="inline-flex" alignItems="center" gap={1}>{awayTeam?.name}</Box></TableCell>
        <TableCell>{match.sub_tournament_name}</TableCell>
        <TableCell>
          {h2h
            ? `${h2h.aWins}W/${h2h.aLosses}L, ${h2h.bWins}W/${h2h.bLosses}L`
            : '-'}
        </TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>{aForm}</TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>{bForm}</TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>
          {last5A.length > 0
            ? last5A.map((m: any) => (m.badge === 'W' ? '✓' : '❌')).join(' ')
            : '-'}
        </TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>
          {last5B.length > 0
            ? last5B.map((m: any) => (m.badge === 'W' ? '✓' : '❌')).join(' ')
            : '-'}
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" variant="h5" sx={{ mt: 4 }}>
          {error}
        </Typography>
      </Container>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box display="flex" minHeight="100vh" bgcolor="background.default">
        <Container
          maxWidth="lg"
          sx={{
            py: 4,
            minHeight: '100vh',
            background: 'none',
            flex: 1,
          }}
        >
          <Box
            sx={{
              width: '100%',
              px: { xs: 2, sm: 4 },
              py: 5,
              mb: 4,
              borderRadius: 0,
              background: 'linear-gradient(180deg, #00b3b3 0%, #006666 100%)',
              boxShadow: 3,
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                textAlign: 'center',
                mt: 0,
                mb: 1,
                color: 'white',
                letterSpacing: 2,
                textShadow: '0 2px 8px #0008',
                fontFamily: 'Montserrat, "Circular", "Roboto", Arial, sans-serif',
              }}
            >
              Upcoming Matches
            </Typography>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 0,
                color: 'white',
                fontWeight: 700,
                fontFamily: 'Montserrat, "Circular", "Roboto", Arial, sans-serif',
                letterSpacing: 1,
                textShadow: '0 1px 6px #0008',
              }}
            >
              Statistics and form for all matches
            </Typography>
          </Box>

          <TableContainer 
            component={Paper} 
            elevation={4} 
            sx={{ 
              mt: 4, 
              borderRadius: 0,
              boxShadow: 6, 
              overflow: 'hidden', 
              bgcolor: '#222326' 
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{
                  background: 'linear-gradient(90deg, #232323 0%, #1db954 100%)',
                  '& th': {
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: 1,
                    fontFamily: 'Montserrat, "Circular", "Roboto", Arial, sans-serif',
                    textShadow: '0 2px 8px #1db95444',
                    borderBottom: '2px solid #1db954',
                    position: 'relative',
                    py: 2,
                  },
                }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Home Team</TableCell>
                  <TableCell>Away Team</TableCell>
                  <TableCell>Tournament</TableCell>
                  <TableCell>H2H (A W/L, B W/L)</TableCell>
                  <TableCell>Today's Form (A)</TableCell>
                  <TableCell>Today's Form (B)</TableCell>
                  <TableCell>Last 5 Matches (A)</TableCell>
                  <TableCell>Last 5 Matches (B)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matches && matches.length > 0 ? (
                  matches.map((match, index) => renderMatchRow(match, index))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No matches found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 