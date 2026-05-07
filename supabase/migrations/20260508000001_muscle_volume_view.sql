CREATE OR REPLACE VIEW muscle_volume_daily_view AS
SELECT
  ws.user_id,
  DATE_TRUNC('day', ws.logged_at) AS day_start,
  CASE
    WHEN e.target_muscle IN ('chest') THEN 'chest'
    WHEN e.target_muscle IN ('lats', 'middle back', 'lower back', 'upper back', 'traps') THEN 'back'
    WHEN e.target_muscle IN ('delts', 'shoulders') THEN 'shoulders'
    WHEN e.target_muscle IN ('biceps', 'brachialis') THEN 'biceps'
    WHEN e.target_muscle IN ('triceps') THEN 'triceps'
    WHEN e.target_muscle IN ('forearms') THEN 'forearms'
    WHEN e.target_muscle IN ('quads', 'quadriceps') THEN 'quads'
    WHEN e.target_muscle IN ('hamstrings') THEN 'hamstrings'
    WHEN e.target_muscle IN ('glutes') THEN 'glutes'
    WHEN e.target_muscle IN ('calves') THEN 'calves'
    WHEN e.target_muscle IN ('abdominals', 'abs', 'core', 'obliques') THEN 'core'
    WHEN e.target_muscle IN ('adductors', 'abductors', 'hip flexors') THEN 'hip flexors'
    ELSE 'other'
  END AS muscle_group,
  SUM(ws.weight_kg * ws.reps) AS volume,
  COUNT(DISTINCT ws.workout_session_id) AS frequency,
  MAX(ws.logged_at) as last_trained_at
FROM workout_sets ws
JOIN exercises e ON e.id = ws.exercise_id
WHERE ws.is_warmup = false
GROUP BY ws.user_id, DATE_TRUNC('day', ws.logged_at), muscle_group;
