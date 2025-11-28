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
  CssBaseline,
  Divider
} from '@mui/material';
import { fetchMatchListData, fetchH2H } from './services/api';
import { Match } from './types/api';
import StarIcon from '@mui/icons-material/Star';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { keyframes } from '@mui/system';
import Fade from '@mui/material/Fade';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2f81f7' }, // GitHub blue
    secondary: { main: '#2383e2' },
    background: { default: '#0d1117', paper: '#161b22' },
    text: { primary: '#c9d1d9', secondary: '#8b949e' },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: 'Inter, Montserrat, "Circular", "Roboto", Arial, sans-serif',
    h4: { fontWeight: 900, letterSpacing: 1.5 },
    h5: { fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
        },
      },
    },
  },
});

const glowVs = keyframes`
  0% { color: #ff4081; text-shadow: 0 0 8px #ff4081, 0 0 16px #ff4081; }
  20% { color: #00bcd4; text-shadow: 0 0 8px #00bcd4, 0 0 16px #00bcd4; }
  40% { color: #cddc39; text-shadow: 0 0 8px #cddc39, 0 0 16px #cddc39; }
  60% { color: #ff9800; text-shadow: 0 0 8px #ff9800, 0 0 16px #ff9800; }
  80% { color: #2f81f7; text-shadow: 0 0 8px #2f81f7, 0 0 16px #2f81f7; }
  100% { color: #ff4081; text-shadow: 0 0 8px #ff4081, 0 0 16px #ff4081; }
`;

const modalGlow = keyframes`
  0% { box-shadow: 0 0 24px 4px #ff408155, 0 0 0 #0000; }
  20% { box-shadow: 0 0 24px 4px #00bcd455, 0 0 0 #0000; }
  40% { box-shadow: 0 0 24px 4px #cddc3955, 0 0 0 #0000; }
  60% { box-shadow: 0 0 24px 4px #ff980055, 0 0 0 #0000; }
  80% { box-shadow: 0 0 24px 4px #2f81f755, 0 0 0 #0000; }
  100% { box-shadow: 0 0 24px 4px #ff408155, 0 0 0 #0000; }
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

function getInitialAndLastName(name: string | undefined) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  return `${parts[0][0]}.${parts.slice(1).join(' ')}`;
}

function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [h2hSummary, setH2hSummary] = useState<{ [key: number]: { aWins: number, bWins: number, aLosses: number, bLosses: number } }>({});
  const [h2hResultsById, setH2hResultsById] = useState<{ [key: number]: any }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchMatchListData();
        // Filter out matches before now
        const now = new Date();
        const upcomingMatches = (data.matches || []).filter(match => new Date(match.start_date) >= now);
        setMatches(upcomingMatches);

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

  const handleRowClick = (match: Match) => {
    setSelectedMatch(match);
    setModalOpen(true);
  };
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedMatch(null);
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
      ? todayMatchesA.map((m: any) => (m.badge === 'W' ? '✓' : '❌'))
      : null;
    const bForm = todayMatchesB.length > 0
      ? todayMatchesB.map((m: any) => (m.badge === 'W' ? '✓' : '❌'))
      : null;

    const goodBet = isGoodBet(h2h, aForm?.join(' ') || '', bForm?.join(' ') || '');

    return (
      <TableRow
        key={match.id}
        sx={{
          '&:hover': {
            background: '#23272e',
            zIndex: 1,
          },
          backgroundColor: (index % 2 === 0) ? '#161b22' : '#0d1117',
          borderBottom: '1px solid #21262d',
          transition: 'background 0.2s',
          cursor: 'pointer',
        }}
        onClick={() => handleRowClick(match)}
      >
        <TableCell>{new Date(match.start_date).toLocaleString()}</TableCell>
        <TableCell>
          <Box display="inline-flex" alignItems="center" gap={1}>
            {homeTeam?.name}
            {goodBet && (
              <Chip 
                label={<><StarIcon sx={{ fontSize: 16, mr: 0.5, mb: '-2px' }} />Good Bet</>}
                size="small" 
                sx={{ 
                  bgcolor: '#2f81f7',
                  color: 'white',
                  fontWeight: 'bold',
                  borderRadius: 1,
                  letterSpacing: 0.5,
                  boxShadow: '0 2px 8px 0 #2f81f744',
                  fontSize: { xs: 12, sm: 14 },
                  px: 1.2,
                  py: 0.2,
                  ml: 1,
                }} 
              />
            )}
          </Box>
        </TableCell>
        <TableCell><Box display="inline-flex" alignItems="center" gap={1}>{awayTeam?.name}</Box></TableCell>
        <TableCell>{match.sub_tournament_name}</TableCell>
        <TableCell>
          {h2h ? (
            h2h.aWins === 0 && h2h.aLosses === 0 && h2h.bWins === 0 && h2h.bLosses === 0 ? (
              <span style={{ color: '#b3b3b3', fontStyle: 'italic' }}>No previous H2H matches</span>
            ) : (
              <Box display="flex" flexDirection="column" gap={0.5}>
                <Box>
                  <>
                    {Array.from({ length: h2h.aWins }).map((_, i) => (
                      <span key={`a-win-${i}`} style={{ color: '#1db954', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>✓</span>
                    ))}
                    {Array.from({ length: h2h.aLosses }).map((_, i) => (
                      <span key={`a-loss-${i}`} style={{ color: '#e53935', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>❌</span>
                    ))}
                    <span style={{ marginLeft: 6, color: '#b3b3b3', fontSize: '0.95em' }}>({getInitialAndLastName(match.participants.find(p => p.type === 'home_team')?.name)})</span>
                  </>
                </Box>
                <Box>
                  <>
                    {Array.from({ length: h2h.bWins }).map((_, i) => (
                      <span key={`b-win-${i}`} style={{ color: '#1db954', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>✓</span>
                    ))}
                    {Array.from({ length: h2h.bLosses }).map((_, i) => (
                      <span key={`b-loss-${i}`} style={{ color: '#e53935', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>❌</span>
                    ))}
                    <span style={{ marginLeft: 6, color: '#b3b3b3', fontSize: '0.95em' }}>({getInitialAndLastName(match.participants.find(p => p.type === 'away_team')?.name)})</span>
                  </>
                </Box>
              </Box>
            )
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>
          {aForm ? aForm.map((v: string, i: number) => (
            <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: v === '✓' ? '#1db954' : '#e53935' }}>{v}</span>
          )) : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />}
        </TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>
          {bForm ? bForm.map((v: string, i: number) => (
            <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: v === '✓' ? '#1db954' : '#e53935' }}>{v}</span>
          )) : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />}
        </TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>
          {last5A.length > 0
            ? last5A.map((m: any, i: number) => (
                <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: m.badge === 'W' ? '#1db954' : '#e53935' }}>{m.badge === 'W' ? '✓' : '❌'}</span>
              ))
            : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />}
        </TableCell>
        <TableCell sx={{ color: '#1db954', minWidth: '120px', whiteSpace: 'nowrap' }}>
          {last5B.length > 0
            ? last5B.map((m: any, i: number) => (
                <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: m.badge === 'W' ? '#1db954' : '#e53935' }}>{m.badge === 'W' ? '✓' : '❌'}</span>
              ))
            : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />}
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
      <Box display="flex" minHeight="100vh" bgcolor="background.default" sx={{ width: '100vw', minHeight: '100vh', p: 0, m: 0 }}>
        <Container
          disableGutters
          sx={{
            width: '100vw',
            minHeight: '100vh',
            background: 'none',
            flex: 1,
            p: 0,
            m: 0,
          }}
        >
          <Box
            sx={{
              width: '100vw',
              px: 0,
              py: { xs: 2, sm: 5 },
              mb: 4,
              borderRadius: 0,
              background: 'linear-gradient(120deg, #161b22 0%, #0d1117 100%)',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: { xs: 120, sm: 180 },
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
                color: '#c9d1d9',
                letterSpacing: 2,
                textShadow: 'none',
                fontFamily: 'Inter, Montserrat, "Circular", "Roboto", Arial, sans-serif',
                fontSize: { xs: 28, sm: 36 },
              }}
            >
              Upcoming Matches
            </Typography>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 0,
                color: '#8b949e',
                fontWeight: 600,
                fontFamily: 'Inter, Montserrat, "Circular", "Roboto", Arial, sans-serif',
                letterSpacing: 1,
                textShadow: 'none',
                fontSize: { xs: 16, sm: 20 },
              }}
            >
              Statistics and form for all matches
            </Typography>
          </Box>

          <Box sx={{ width: '100vw', overflowX: 'auto', p: 0, m: 0 }}>
            <TableContainer 
              component={Paper} 
              elevation={0} 
              sx={{ 
                mt: 4, 
                borderRadius: 0,
                boxShadow: 'none',
                overflow: 'auto', 
                bgcolor: 'background.paper',
                width: '100vw',
                minWidth: 600,
                p: 0,
                m: 0,
                border: '1px solid #30363d',
                // Modern scrollbar
                '&::-webkit-scrollbar': {
                  height: 8,
                  background: '#161b22',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#30363d',
                  borderRadius: 4,
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#2f81f7',
                },
              }}
            >
              <Table sx={{ width: '100vw', minWidth: 600 }} size="small">
                <TableHead>
                  <TableRow sx={{
                    background: '#21262d',
                    boxShadow: '0 4px 16px 0 #2f81f733',
                    '& th': {
                      color: '#f0f6fc',
                      fontWeight: 900,
                      fontSize: { xs: 13, sm: 18 },
                      letterSpacing: 1,
                      fontFamily: 'Inter, Montserrat, "Circular", "Roboto", Arial, sans-serif',
                      textShadow: 'none',
                      borderBottom: '2px solid #30363d',
                      position: 'relative',
                      py: { xs: 1.2, sm: 2.2 },
                      px: { xs: 1, sm: 2 },
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                    },
                  }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Home Team</TableCell>
                    <TableCell>Away Team</TableCell>
                    <TableCell>Tournament</TableCell>
                    <TableCell>H2H</TableCell>
                    <TableCell>Today's Form (H)</TableCell>
                    <TableCell>Today's Form (A)</TableCell>
                    <TableCell>Last 5 Matches (H)</TableCell>
                    <TableCell>Last 5 Matches (A)</TableCell>
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
          </Box>
        </Container>
      </Box>
      {/* Modal for match details */}
      <Dialog
        open={modalOpen}
        onClose={handleModalClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            bgcolor: '#0d1117',
            borderRadius: 2,
            animation: `${modalGlow} 2.5s linear infinite`,
            backgroundImage: 'none !important',
            color: '#c9d1d9',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#010409', color: '#f0f6fc', fontWeight: 700, fontSize: 22 }}>
          Match Details
          <IconButton onClick={handleModalClose} sx={{ color: '#8b949e' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedMatch && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1, color: '#2f81f7', fontWeight: 700 }}>
                <span style={{ color: '#ff9800' }}>{selectedMatch.participants.find(p => p.type === 'home_team')?.name}</span>
                <Box component="span" sx={{ fontWeight: 800, mx: 1.5, animation: `${glowVs} 2.5s linear infinite`, display: 'inline-block' }}>vs</Box>
                <span style={{ color: '#ff9800' }}>{selectedMatch.participants.find(p => p.type === 'away_team')?.name}</span>
              </Typography>
              <Typography sx={{ mb: 1 }}>
                <b>Date:</b> {new Date(selectedMatch.start_date).toLocaleString()}
              </Typography>
              <Typography sx={{ mb: 1 }}>
                <b>Tournament:</b> {selectedMatch.sub_tournament_name}
              </Typography>
              <Divider sx={{ my: 2, bgcolor: '#30363d' }} />
              <Typography sx={{ mb: 1, fontWeight: 600 }}>H2H:</Typography>
              {h2hSummary[selectedMatch.id] ? (
                h2hSummary[selectedMatch.id].aWins === 0 && h2hSummary[selectedMatch.id].aLosses === 0 && h2hSummary[selectedMatch.id].bWins === 0 && h2hSummary[selectedMatch.id].bLosses === 0 ? (
                  <span style={{ color: '#b3b3b3', fontStyle: 'italic' }}>No previous H2H matches</span>
                ) : (
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    <Box>
                      <>
                        {Array.from({ length: h2hSummary[selectedMatch.id].aWins }).map((_, i) => (
                          <span key={`modal-a-win-${i}`} style={{ color: '#1db954', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>✓</span>
                        ))}
                        {Array.from({ length: h2hSummary[selectedMatch.id].aLosses }).map((_, i) => (
                          <span key={`modal-a-loss-${i}`} style={{ color: '#e53935', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>❌</span>
                        ))}
                        <span style={{ marginLeft: 6, color: '#b3b3b3', fontSize: '0.95em' }}>({getInitialAndLastName(selectedMatch.participants.find(p => p.type === 'home_team')?.name)})</span>
                      </>
                    </Box>
                    <Box>
                      <>
                        {Array.from({ length: h2hSummary[selectedMatch.id].bWins }).map((_, i) => (
                          <span key={`modal-b-win-${i}`} style={{ color: '#1db954', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>✓</span>
                        ))}
                        {Array.from({ length: h2hSummary[selectedMatch.id].bLosses }).map((_, i) => (
                          <span key={`modal-b-loss-${i}`} style={{ color: '#e53935', fontWeight: 'bold', fontSize: '1.1em', display: 'inline-block', width: 20, textAlign: 'center', fontFamily: 'monospace' }}>❌</span>
                        ))}
                        <span style={{ marginLeft: 6, color: '#b3b3b3', fontSize: '0.95em' }}>({getInitialAndLastName(selectedMatch.participants.find(p => p.type === 'away_team')?.name)})</span>
                      </>
                    </Box>
                  </Box>
                )
              ) : (
                <span>-</span>
              )}
              <Divider sx={{ my: 2, bgcolor: '#30363d' }} />
              <Typography sx={{ mb: 1, fontWeight: 600 }}>Today's Form:</Typography>
              <Box display="flex" gap={2}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>
                    {selectedMatch.participants.find(p => p.type === 'home_team')?.name}
                  </Typography>
                  <Typography sx={{ color: '#2f81f7', fontWeight: 600 }}>
                    {(() => {
                      const h2hRaw = h2hResultsById[selectedMatch.id];
                      const todayMatchesA = (h2hRaw?.total?.home_team || []).filter((m: any) => isTodayUTC(m.date)).slice(0, 5);
                      return todayMatchesA.length > 0
                        ? todayMatchesA.map((m: any, i: number) => (
                            <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: m.badge === 'W' ? '#1db954' : '#e53935' }}>{m.badge === 'W' ? '✓' : '❌'}</span>
                          ))
                        : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />;
                    })()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>
                    {selectedMatch.participants.find(p => p.type === 'away_team')?.name}
                  </Typography>
                  <Typography sx={{ color: '#2f81f7', fontWeight: 600 }}>
                    {(() => {
                      const h2hRaw = h2hResultsById[selectedMatch.id];
                      const todayMatchesB = (h2hRaw?.total?.away_team || []).filter((m: any) => isTodayUTC(m.date)).slice(0, 5);
                      return todayMatchesB.length > 0
                        ? todayMatchesB.map((m: any, i: number) => (
                            <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: m.badge === 'W' ? '#1db954' : '#e53935' }}>{m.badge === 'W' ? '✓' : '❌'}</span>
                          ))
                        : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />;
                    })()}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2, bgcolor: '#30363d' }} />
              <Typography sx={{ mb: 1, fontWeight: 600 }}>Last 5 Matches:</Typography>
              <Box display="flex" gap={2}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>
                    {selectedMatch.participants.find(p => p.type === 'home_team')?.name}
                  </Typography>
                  <Typography sx={{ color: '#2f81f7', fontWeight: 600 }}>
                    {(() => {
                      const h2hRaw = h2hResultsById[selectedMatch.id];
                      const last5A = (h2hRaw?.total?.home_team || []).slice(0, 5);
                      return last5A.length > 0
                        ? last5A.map((m: any, i: number) => (
                            <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: m.badge === 'W' ? '#1db954' : '#e53935' }}>{m.badge === 'W' ? '✓' : '❌'}</span>
                          ))
                        : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />;
                    })()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>
                    {selectedMatch.participants.find(p => p.type === 'away_team')?.name}
                  </Typography>
                  <Typography sx={{ color: '#2f81f7', fontWeight: 600 }}>
                    {(() => {
                      const h2hRaw = h2hResultsById[selectedMatch.id];
                      const last5B = (h2hRaw?.total?.away_team || []).slice(0, 5);
                      return last5B.length > 0
                        ? last5B.map((m: any, i: number) => (
                            <span key={i} style={{ fontFamily: 'monospace', display: 'inline-block', width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: m.badge === 'W' ? '#1db954' : '#e53935' }}>{m.badge === 'W' ? '✓' : '❌'}</span>
                          ))
                        : <RemoveCircleOutlineIcon sx={{ color: '#ff9800', fontSize: 22, verticalAlign: 'middle' }} />;
                    })()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}

export default App; 