UPDATE automation_runs
SET started_at = started_at - 28800000,
    finished_at = finished_at - 28800000
WHERE job_id IN (
  SELECT j.id
  FROM automation_jobs j
  JOIN connectors c ON c.id = j.connector_id
  WHERE c.plugin_id = 'dolphinscheduler'
);
