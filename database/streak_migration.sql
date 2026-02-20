-- Add persistent streak tracking table
CREATE TABLE IF NOT EXISTS user_daily_streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, streak_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_streaks_user_id ON user_daily_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_streaks_date ON user_daily_streaks(streak_date);
