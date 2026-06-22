/**
 * Source of truth for credit pricing. Imported by both server (enforcement)
 * and client (cost hints next to action buttons). Numbers tuned so:
 *  - 100 free starter credits = roughly one sitting of exploration
 *  - 3,000 monthly trial/paid credits = comfortable for daily use, bounded
 *    enough that power users land on top-up packs
 */

export type CreditAction =
  | "chat"
  | "chart_roast"
  | "drill_replay"
  | "drill_question"
  | "drill_speed"
  | "drill_sniper";

export const CREDIT_COSTS: Record<CreditAction, number> = {
  chat: 10,
  chart_roast: 25,
  drill_replay: 5,
  drill_question: 3,
  drill_speed: 5,
  drill_sniper: 5,
};

/** First-time grant for any new account, no card required. */
export const WELCOME_CREDIT_GRANT = 100;
/** What a trial/paid month grants. */
export const MONTHLY_CREDIT_GRANT = 3000;
