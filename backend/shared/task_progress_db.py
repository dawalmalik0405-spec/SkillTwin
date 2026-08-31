"""
Task Progress Database Helper
Handles persistent storage of roadmap task completion using PostgreSQL database.
Ensures each user's task progress is isolated and persisted across server restarts.
"""

import uuid
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID

# Add parent directory to path for imports
_backend_path = Path(__file__).resolve().parent.parent
if str(_backend_path) not in sys.path:
    sys.path.insert(0, str(_backend_path))

try:
    from backend.database import SessionLocal
    from backend.shared.models import TaskProgressModel, UserModel
except ImportError:
    from database import SessionLocal
    from shared.models import TaskProgressModel, UserModel


class TaskProgressDB:
    """
    Database operations for roadmap task progress.
    Provides user data isolation - each user can only access their own task progress.
    """

    @staticmethod
    def get_user_progress(user_id: str) -> Dict[str, bool]:
        """
        Retrieve all task progress for a specific user.

        Args:
            user_id: The user's UUID as a string

        Returns:
            Dictionary mapping task_id to is_completed status
            Example: {"task-p1-1": True, "task-p1-2": False, ...}
        """
        db = SessionLocal()
        try:
            progress_records = db.query(TaskProgressModel).filter(
                TaskProgressModel.user_id == uuid.UUID(user_id)
            ).all()

            return {record.task_id: record.is_completed for record in progress_records}
        except Exception as e:
            print(f"[TaskProgressDB] Error getting user progress: {e}")
            return {}
        finally:
            db.close()

    @staticmethod
    def set_task_completion(
        user_id: str,
        task_id: str,
        is_completed: bool
    ) -> bool:
        """
        Set or update a task's completion status for a user.
        Creates new record if doesn't exist, updates existing record if it does.

        Args:
            user_id: The user's UUID as a string
            task_id: The task identifier (e.g., "task-p1-1")
            is_completed: Whether the task is completed

        Returns:
            True if successful, False otherwise
        """
        db = SessionLocal()
        try:
            user_uuid = uuid.UUID(user_id)

            # Check if record exists
            existing = db.query(TaskProgressModel).filter(
                TaskProgressModel.user_id == user_uuid,
                TaskProgressModel.task_id == task_id
            ).first()

            if existing:
                # Update existing record
                existing.is_completed = is_completed
                if is_completed:
                    existing.completed_at = datetime.utcnow()
                else:
                    existing.completed_at = None
                existing.updated_at = datetime.utcnow()
            else:
                # Create new record
                new_record = TaskProgressModel(
                    user_id=user_uuid,
                    task_id=task_id,
                    is_completed=is_completed,
                    completed_at=datetime.utcnow() if is_completed else None
                )
                db.add(new_record)

            db.commit()
            print(f"[TaskProgressDB] Task '{task_id}' set to {is_completed} for user '{user_id}'")
            return True

        except Exception as e:
            db.rollback()
            print(f"[TaskProgressDB] Error setting task completion: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def toggle_task(
        user_id: str,
        task_id: str
    ) -> Optional[bool]:
        """
        Toggle a task's completion status.

        Args:
            user_id: The user's UUID as a string
            task_id: The task identifier

        Returns:
            New completion status after toggle, or None on error
        """
        db = SessionLocal()
        try:
            user_uuid = uuid.UUID(user_id)

            existing = db.query(TaskProgressModel).filter(
                TaskProgressModel.user_id == user_uuid,
                TaskProgressModel.task_id == task_id
            ).first()

            if existing:
                new_status = not existing.is_completed
                existing.is_completed = new_status
                if new_status:
                    existing.completed_at = datetime.utcnow()
                else:
                    existing.completed_at = None
                existing.updated_at = datetime.utcnow()
            else:
                # Task doesn't exist, create as completed (toggle ON)
                new_status = True
                new_record = TaskProgressModel(
                    user_id=user_uuid,
                    task_id=task_id,
                    is_completed=True,
                    completed_at=datetime.utcnow()
                )
                db.add(new_record)

            db.commit()
            print(f"[TaskProgressDB] Task '{task_id}' toggled to {new_status} for user '{user_id}'")
            return new_status

        except Exception as e:
            db.rollback()
            print(f"[TaskProgressDB] Error toggling task: {e}")
            return None
        finally:
            db.close()

    @staticmethod
    def get_task_status(user_id: str, task_id: str) -> bool:
        """
        Get the completion status of a specific task for a user.

        Args:
            user_id: The user's UUID as a string
            task_id: The task identifier

        Returns:
            True if completed, False otherwise
        """
        db = SessionLocal()
        try:
            record = db.query(TaskProgressModel).filter(
                TaskProgressModel.user_id == uuid.UUID(user_id),
                TaskProgressModel.task_id == task_id
            ).first()

            return record.is_completed if record else False

        except Exception as e:
            print(f"[TaskProgressDB] Error getting task status: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def get_completed_tasks_count(user_id: str) -> int:
        """
        Get the total number of completed tasks for a user.

        Args:
            user_id: The user's UUID as a string

        Returns:
            Number of completed tasks
        """
        db = SessionLocal()
        try:
            count = db.query(TaskProgressModel).filter(
                TaskProgressModel.user_id == uuid.UUID(user_id),
                TaskProgressModel.is_completed == True
            ).count()

            return count

        except Exception as e:
            print(f"[TaskProgressDB] Error getting completed count: {e}")
            return 0
        finally:
            db.close()

    @staticmethod
    def clear_user_progress(user_id: str) -> bool:
        """
        Clear all task progress for a user (reset).

        Args:
            user_id: The user's UUID as a string

        Returns:
            True if successful, False otherwise
        """
        db = SessionLocal()
        try:
            deleted = db.query(TaskProgressModel).filter(
                TaskProgressModel.user_id == uuid.UUID(user_id)
            ).delete()

            db.commit()
            print(f"[TaskProgressDB] Cleared {deleted} task records for user '{user_id}'")
            return True

        except Exception as e:
            db.rollback()
            print(f"[TaskProgressDB] Error clearing progress: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def ensure_user_progress_exists(user_id: str) -> bool:
        """
        Verify that a user exists in the database.
        This helps with data isolation - we can only track progress for registered users.

        Args:
            user_id: The user's UUID as a string

        Returns:
            True if user exists, False otherwise
        """
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(
                UserModel.id == uuid.UUID(user_id)
            ).first()

            return user is not None

        except Exception as e:
            print(f"[TaskProgressDB] Error checking user existence: {e}")
            return False
        finally:
            db.close()
