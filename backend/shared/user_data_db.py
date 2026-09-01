"""
User Data Database Helper
Handles persistent storage of user evidence, skills, skill twin state, projects, and roadmaps.
All data is user-isolated - each user can only access their own data.
"""

import uuid
import json
from datetime import datetime
from typing import Dict, Optional, List, Any
from sqlalchemy.orm import Session
from pathlib import Path
import sys

# Add backend to path
_backend_path = Path(__file__).resolve().parent.parent
if str(_backend_path) not in sys.path:
    sys.path.insert(0, str(_backend_path))

from backend.database import SessionLocal
from backend.shared.models import (
    UserEvidenceModel,
    UserSkillModel,
    SkillTwinStateModel,
    UserProjectModel,
    UserRoadmapModel,
    UserModel,
    EvidenceSourceModel,
)


class UserDataDB:
    """
    Database operations for user evidence and persistent data.
    Ensures user data isolation - each user can only access their own data.
    """

    @staticmethod
    def _get_db():
        return SessionLocal()

    # =========================================================
    # User Evidence (Resume, GitHub, Projects)
    # =========================================================

    @staticmethod
    def save_user_evidence(user_id: str, evidence_type: str, raw_data: Dict[str, Any], source_identifier: str = None) -> bool:
        """
        Save or update user evidence data.
        One record per user per evidence_type.
        """
        db = UserDataDB._get_db()
        try:
            user_uuid = uuid.UUID(user_id)
            existing = db.query(UserEvidenceModel).filter(
                UserEvidenceModel.user_id == user_uuid,
                UserEvidenceModel.evidence_type == evidence_type
            ).first()

            if existing:
                existing.raw_data = raw_data
                existing.source_identifier = source_identifier
                existing.updated_at = datetime.utcnow()
            else:
                new_record = UserEvidenceModel(
                    user_id=user_uuid,
                    evidence_type=evidence_type,
                    source_identifier=source_identifier,
                    raw_data=raw_data
                )
                db.add(new_record)

            db.commit()
            print(f"[UserDataDB] Saved {evidence_type} evidence for user {user_id}")
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error saving evidence: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def get_user_evidence(user_id: str, evidence_type: str) -> Optional[Dict[str, Any]]:
        """Get user's evidence data by type."""
        db = UserDataDB._get_db()
        try:
            record = db.query(UserEvidenceModel).filter(
                UserEvidenceModel.user_id == uuid.UUID(user_id),
                UserEvidenceModel.evidence_type == evidence_type
            ).first()

            if record:
                return record.raw_data
            return None
        except Exception as e:
            print(f"[UserDataDB] Error getting evidence: {e}")
            return None
        finally:
            db.close()

    @staticmethod
    def get_all_user_evidence(user_id: str) -> Dict[str, Dict[str, Any]]:
        """Get all evidence for a user."""
        db = UserDataDB._get_db()
        try:
            records = db.query(UserEvidenceModel).filter(
                UserEvidenceModel.user_id == uuid.UUID(user_id)
            ).all()

            return {r.evidence_type: r.raw_data for r in records}
        except Exception as e:
            print(f"[UserDataDB] Error getting all evidence: {e}")
            return {}
        finally:
            db.close()

    @staticmethod
    def clear_user_evidence(user_id: str) -> bool:
        """Clear all evidence for a user."""
        db = UserDataDB._get_db()
        try:
            deleted = db.query(UserEvidenceModel).filter(
                UserEvidenceModel.user_id == uuid.UUID(user_id)
            ).delete()
            db.commit()
            print(f"[UserDataDB] Cleared {deleted} evidence records for user {user_id}")
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error clearing evidence: {e}")
            return False
        finally:
            db.close()

    # =========================================================
    # User Skills (Extracted from evidence)
    # =========================================================

    @staticmethod
    def save_user_skills(user_id: str, skills: List[Dict[str, Any]]) -> bool:
        """Save extracted skills for a user."""
        db = UserDataDB._get_db()
        try:
            user_uuid = uuid.UUID(user_id)

            for skill in skills:
                existing = db.query(UserSkillModel).filter(
                    UserSkillModel.user_id == user_uuid,
                    UserSkillModel.canonical_name == skill.get("canonical_name")
                ).first()

                if existing:
                    existing.skill_name = skill.get("skill_name", skill.get("canonical_name"))
                    existing.category = skill.get("category")
                    existing.proficiency = skill.get("proficiency", "Beginner")
                    existing.confidence_score = skill.get("confidence_score", 0.0)
                    existing.evidence_source = skill.get("evidence_source")
                    existing.context_snippet = skill.get("context_snippet")
                    existing.reasoning = skill.get("reasoning")
                    existing.updated_at = datetime.utcnow()
                else:
                    new_skill = UserSkillModel(
                        user_id=user_uuid,
                        skill_name=skill.get("skill_name", skill.get("canonical_name")),
                        canonical_name=skill.get("canonical_name"),
                        category=skill.get("category"),
                        proficiency=skill.get("proficiency", "Beginner"),
                        confidence_score=skill.get("confidence_score", 0.0),
                        evidence_source=skill.get("evidence_source"),
                        context_snippet=skill.get("context_snippet"),
                        reasoning=skill.get("reasoning")
                    )
                    db.add(new_skill)

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error saving skills: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def get_user_skills(user_id: str) -> List[Dict[str, Any]]:
        """Get all skills for a user."""
        db = UserDataDB._get_db()
        try:
            records = db.query(UserSkillModel).filter(
                UserSkillModel.user_id == uuid.UUID(user_id)
            ).all()

            return [{
                "skill_name": r.skill_name,
                "canonical_name": r.canonical_name,
                "category": r.category,
                "proficiency": r.proficiency,
                "confidence_score": float(r.confidence_score) if r.confidence_score else 0.0,
                "evidence_source": r.evidence_source,
                "context_snippet": r.context_snippet,
                "reasoning": r.reasoning
            } for r in records]
        except Exception as e:
            print(f"[UserDataDB] Error getting skills: {e}")
            return []
        finally:
            db.close()

    @staticmethod
    def clear_user_skills(user_id: str) -> bool:
        """Clear all skills for a user."""
        db = UserDataDB._get_db()
        try:
            deleted = db.query(UserSkillModel).filter(
                UserSkillModel.user_id == uuid.UUID(user_id)
            ).delete()
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error clearing skills: {e}")
            return False
        finally:
            db.close()

    # =========================================================
    # Skill Twin State
    # =========================================================

    @staticmethod
    def save_skill_twin_state(user_id: str, overall_score: int, rating_label: str,
                              skills_data: Dict, breakdown_data: Dict = None,
                              insights_data: Dict = None) -> bool:
        """Save or update user's SkillTwin state."""
        db = UserDataDB._get_db()
        try:
            user_uuid = uuid.UUID(user_id)
            existing = db.query(SkillTwinStateModel).filter(
                SkillTwinStateModel.user_id == user_uuid
            ).first()

            if existing:
                existing.overall_score = overall_score
                existing.rating_label = rating_label
                existing.skills_data = skills_data
                existing.breakdown_data = breakdown_data
                existing.insights_data = insights_data
                existing.last_updated = datetime.utcnow()
            else:
                new_record = SkillTwinStateModel(
                    user_id=user_uuid,
                    overall_score=overall_score,
                    rating_label=rating_label,
                    skills_data=skills_data,
                    breakdown_data=breakdown_data,
                    insights_data=insights_data
                )
                db.add(new_record)

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error saving skill twin state: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def get_skill_twin_state(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's SkillTwin state."""
        db = UserDataDB._get_db()
        try:
            record = db.query(SkillTwinStateModel).filter(
                SkillTwinStateModel.user_id == uuid.UUID(user_id)
            ).first()

            if record:
                return {
                    "overall_score": record.overall_score,
                    "rating_label": record.rating_label,
                    "skills_data": record.skills_data,
                    "breakdown_data": record.breakdown_data,
                    "insights_data": record.insights_data,
                    "last_updated": record.last_updated.isoformat() if record.last_updated else None
                }
            return None
        except Exception as e:
            print(f"[UserDataDB] Error getting skill twin state: {e}")
            return None
        finally:
            db.close()

    # =========================================================
    # User Projects
    # =========================================================

    @staticmethod
    def save_user_project(user_id: str, project_id: str, title: str, url: str,
                          description: str = None, technologies: List[str] = None,
                          project_data: Dict = None) -> bool:
        """Save or update a user's project."""
        db = UserDataDB._get_db()
        try:
            user_uuid = uuid.UUID(user_id)
            existing = db.query(UserProjectModel).filter(
                UserProjectModel.user_id == uuid.UUID(user_id),
                UserProjectModel.project_id == project_id
            ).first()

            if existing:
                existing.title = title
                existing.url = url
                existing.description = description
                existing.detected_technologies = technologies
                existing.project_data = project_data
                existing.updated_at = datetime.utcnow()
            else:
                new_project = UserProjectModel(
                    user_id=user_uuid,
                    project_id=project_id,
                    title=title,
                    url=url,
                    description=description,
                    detected_technologies=technologies,
                    project_data=project_data
                )
                db.add(new_project)

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error saving project: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def get_user_projects(user_id: str) -> List[Dict[str, Any]]:
        """Get all projects for a user."""
        db = UserDataDB._get_db()
        try:
            records = db.query(UserProjectModel).filter(
                UserProjectModel.user_id == uuid.UUID(user_id)
            ).all()

            return [{
                "project_id": r.project_id,
                "title": r.title,
                "url": r.url,
                "description": r.description,
                "detected_technologies": r.detected_technologies,
                "project_data": r.project_data,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in records]
        except Exception as e:
            print(f"[UserDataDB] Error getting projects: {e}")
            return []
        finally:
            db.close()

    @staticmethod
    def delete_user_project(user_id: str, project_id: str) -> bool:
        """Delete a user's project."""
        db = UserDataDB._get_db()
        try:
            deleted = db.query(UserProjectModel).filter(
                UserProjectModel.user_id == uuid.UUID(user_id),
                UserProjectModel.project_id == project_id
            ).delete()
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error deleting project: {e}")
            return False
        finally:
            db.close()

    # =========================================================
    # User Roadmaps (One active per user)
    # =========================================================

    @staticmethod
    def save_user_roadmap(user_id: str, target_role: str, experience_level: str,
                          daily_effort: str, roadmap_data: Dict) -> bool:
        """Save or update user's active roadmap."""
        db = UserDataDB._get_db()
        try:
            user_uuid = uuid.UUID(user_id)

            # Deactivate any existing active roadmap
            db.query(UserRoadmapModel).filter(
                UserRoadmapModel.user_id == user_uuid,
                UserRoadmapModel.is_active == True
            ).update({"is_active": False, "updated_at": datetime.utcnow()})

            # Create new active roadmap
            new_roadmap = UserRoadmapModel(
                user_id=user_uuid,
                target_role=target_role,
                experience_level=experience_level,
                daily_effort=daily_effort,
                roadmap_data=roadmap_data,
                is_active=True
            )
            db.add(new_roadmap)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error saving roadmap: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def get_active_roadmap(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's active roadmap."""
        db = UserDataDB._get_db()
        try:
            record = db.query(UserRoadmapModel).filter(
                UserRoadmapModel.user_id == uuid.UUID(user_id),
                UserRoadmapModel.is_active == True
            ).first()

            if record:
                return record.roadmap_data
            return None
        except Exception as e:
            print(f"[UserDataDB] Error getting active roadmap: {e}")
            return None
        finally:
            db.close()

    @staticmethod
    def get_all_roadmaps(user_id: str) -> List[Dict[str, Any]]:
        """Get all roadmaps for a user."""
        db = UserDataDB._get_db()
        try:
            records = db.query(UserRoadmapModel).filter(
                UserRoadmapModel.user_id == uuid.UUID(user_id)
            ).order_by(UserRoadmapModel.created_at.desc()).all()

            return [{
                "id": str(r.id),
                "target_role": r.target_role,
                "experience_level": r.experience_level,
                "daily_effort": r.daily_effort,
                "roadmap_data": r.roadmap_data,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in records]
        except Exception as e:
            print(f"[UserDataDB] Error getting roadmaps: {e}")
            return []
        finally:
            db.close()

    # =========================================================
    # Clear All User Data (for reset)
    # =========================================================

    @staticmethod
    def clear_all_user_data(user_id: str) -> bool:
        """Clear ALL persistent data for a user (use with caution)."""
        db = UserDataDB._get_db()
        try:
            user_uuid = uuid.UUID(user_id)

            # Delete in order of dependencies
            db.query(UserRoadmapModel).filter(UserRoadmapModel.user_id == user_uuid).delete()
            db.query(UserProjectModel).filter(UserProjectModel.user_id == user_uuid).delete()
            db.query(UserEvidenceModel).filter(UserEvidenceModel.user_id == user_uuid).delete()
            db.query(UserEvidenceModel).filter(UserEvidenceModel.user_id == user_uuid).delete()
            db.query(UserSkillModel).filter(UserSkillModel.user_id == user_uuid).delete()
            db.query(SkillTwinStateModel).filter(SkillTwinStateModel.user_id == user_uuid).delete()
            db.query(UserRoadmapModel).filter(UserRoadmapModel.user_id == user_uuid).delete()

            db.commit()
            print(f"[UserDataDB] Cleared ALL data for user {user_id}")
            return True
        except Exception as e:
            db.rollback()
            print(f"[UserDataDB] Error clearing all data: {e}")
            return False
        finally:
            db.close()

    @staticmethod
    def user_exists(user_id: str) -> bool:
        """Check if a user exists in the database."""
        db = UserDataDB._get_db()
        try:
            user = db.query(UserModel).filter(UserModel.id == uuid.UUID(user_id)).first()
            return user is not None
        except Exception as e:
            print(f"[UserDataDB] Error checking user existence: {e}")
            return False
        finally:
            db.close()


# Backward-compatible functions for existing code
def save_user_evidence(user_id: str, evidence_type: str, raw_data: Dict, source_identifier: str = None) -> bool:
    """Backward compatible function."""
    return UserDataDB.save_user_evidence(user_id, evidence_type, raw_data, source_identifier)


def get_user_evidence(user_id: str, evidence_type: str) -> Optional[Dict]:
    return UserDataDB.get_user_evidence(user_id, evidence_type)


def get_all_user_evidence(user_id: str) -> Dict:
    return UserDataDB.get_all_user_evidence(user_id)


def save_user_skills(user_id: str, skills: List[Dict]) -> bool:
    return UserDataDB.save_user_skills(user_id, skills)


def get_user_skills(user_id: str) -> List[Dict]:
    return UserDataDB.get_user_skills(user_id)


def save_skill_twin_state(user_id: str, overall_score: int, rating_label: str,
                          skills_data: Dict, breakdown_data: Dict = None,
                          insights_data: Dict = None) -> bool:
    return UserDataDB.save_skill_twin_state(user_id, overall_score, rating_label,
                                             skills_data, breakdown_data, insights_data)


def get_skill_twin_state(user_id: str) -> Optional[Dict]:
    return UserDataDB.get_skill_twin_state(user_id)


def save_user_project(user_id: str, project_id: str, title: str, url: str,
                      description: str = None, technologies: List[str] = None,
                      project_data: Dict = None) -> bool:
    return UserDataDB.save_user_project(user_id, project_id, title, url,
                                         description, None, project_data)


def get_user_projects(user_id: str) -> List[Dict]:
    return UserDataDB.get_user_projects(user_id)


def save_user_roadmap(user_id: str, target_role: str, experience_level: str,
                      daily_effort: str, roadmap_data: Dict) -> bool:
    return UserDataDB.save_user_roadmap(user_id, target_role, experience_level,
                                         daily_effort, roadmap_data)


def get_active_roadmap(user_id: str) -> Optional[Dict]:
    return UserDataDB.get_active_roadmap(user_id)


def get_all_roadmaps(user_id: str) -> List[Dict]:
    return UserDataDB.get_all_roadmaps(user_id)


def clear_all_user_data(user_id: str) -> bool:
    return UserDataDB.clear_all_user_data(user_id)


def user_exists(user_id: str) -> bool:
    return UserDataDB.user_exists(user_id)