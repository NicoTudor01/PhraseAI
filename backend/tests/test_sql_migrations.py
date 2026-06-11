import re
import unittest
from pathlib import Path


SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def function_body(sql: str, function_name: str) -> str:
    match = re.search(
        rf"create or replace function public\.{function_name}\(\).*?as \$\$(.*?)\$\$;",
        sql,
        flags=re.DOTALL,
    )
    if match is None:
        raise AssertionError(f"Missing SQL function: {function_name}")
    return match.group(1)


class DataArchitectTriggerMigrationTests(unittest.TestCase):
    def test_style_tags_trigger_isolated_from_email_history_fields(self):
        for migration_name in (
            "20260610_data_architect_schema.sql",
            "20260611_fix_data_architect_updated_at_triggers.sql",
        ):
            with self.subTest(migration=migration_name):
                sql = (SQL_DIR / migration_name).read_text()
                body = function_body(sql, "set_style_tags_updated_at")

                self.assertIn("new.updated_at = now()", body)
                self.assertNotIn("final_version", body)
                self.assertNotIn("finalized_at", body)
                self.assertIn(
                    "execute function public.set_style_tags_updated_at()",
                    sql,
                )

    def test_repair_migration_replaces_shared_trigger_idempotently(self):
        sql = (
            SQL_DIR / "20260611_fix_data_architect_updated_at_triggers.sql"
        ).read_text()

        self.assertIn(
            "drop trigger if exists style_tags_set_updated_at",
            sql,
        )
        self.assertIn(
            "drop trigger if exists email_history_set_updated_at",
            sql,
        )
        self.assertIn(
            "drop function if exists public.set_data_architect_updated_at()",
            sql,
        )
        self.assertIn("create or replace function", sql)


if __name__ == "__main__":
    unittest.main()
