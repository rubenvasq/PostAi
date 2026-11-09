-- Una sola sesión de caja OPEN por sucursal. El índice parcial impide que dos
-- aperturas concurrentes dejen dos cajas abiertas para la misma sucursal.
CREATE UNIQUE INDEX "cash_sessions_branch_open_key"
  ON "cash_sessions" ("branchId")
  WHERE "status" = 'OPEN';
