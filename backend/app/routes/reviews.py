from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.reviews import Review
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant

from schemas.reviews import ReviewCreate


router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


# --------------------------------------------------
# HELPER: CHECK REVIEW ELIGIBILITY
# --------------------------------------------------

def check_review_eligibility(
    db: Session,
    reviewer_id: int,
    reviewed_user_id: int
):

    if reviewer_id == reviewed_user_id:
        return False

    common_meetup = db.query(
        MeetupParticipant.id
    ).join(
        Meetup,
        Meetup.id == MeetupParticipant.meetup_id
    ).filter(
        Meetup.status == "completed_success",

        MeetupParticipant.user_id == reviewer_id,
        MeetupParticipant.participation_status == "joined",

        Meetup.id.in_(
            db.query(MeetupParticipant.meetup_id).filter(
                MeetupParticipant.user_id == reviewed_user_id,
                MeetupParticipant.participation_status == "joined"
            )
        )
    ).first()

    return common_meetup is not None


# --------------------------------------------------
# GET REVIEW ELIGIBILITY
# --------------------------------------------------

@router.get("/{player_id}/eligibility")
def get_review_eligibility(
    player_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    player = db.query(User).filter(
        User.id == player_id
    ).first()

    if not player:
        raise HTTPException(
            status_code=404,
            detail="Player not found"
        )

    if current_user.id == player_id:
        return {
            "eligible": False,
            "has_review": False,
            "can_review": False,
            "reason": "You cannot review yourself",
            "current_user_id": current_user.id
        }

    existing_review = db.query(Review).filter(
        Review.reviewer_id == current_user.id,
        Review.reviewed_user_id == player_id
    ).first()

    eligible = check_review_eligibility(
        db,
        current_user.id,
        player_id
    )

    return {
        "eligible": eligible,
        "has_review": existing_review is not None,
        "can_review": eligible and existing_review is None,
        "review_id": (
            existing_review.id
            if existing_review
            else None
        ),
        "reason": (
            "You have already reviewed this player"
            if existing_review
            else (
                None
                if eligible
                else "You need at least one completed meetup together"
            )
        ),
        "current_user_id": current_user.id
    }


# --------------------------------------------------
# CREATE REVIEW
# --------------------------------------------------

@router.post("/{player_id}")
def create_review(
    player_id: int,
    data: ReviewCreate,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if current_user.id == player_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot review yourself"
        )

    player = db.query(User).filter(
        User.id == player_id
    ).first()

    if not player:
        raise HTTPException(
            status_code=404,
            detail="Player not found"
        )

    # Check meetup eligibility
    eligible = check_review_eligibility(
        db,
        current_user.id,
        player_id
    )

    if not eligible:
        raise HTTPException(
            status_code=403,
            detail="You need at least one completed meetup together"
        )

    # Check existing review
    existing_review = db.query(Review).filter(
        Review.reviewer_id == current_user.id,
        Review.reviewed_user_id == player_id
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this player"
        )

    review = Review(
        reviewer_id=current_user.id,
        reviewed_user_id=player_id,
        comment=data.comment.strip(),
        sentiment="neutral"
    )

    db.add(review)

    try:
        db.commit()
        db.refresh(review)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to create review"
        )

    return {
        "message": "Review submitted successfully",
        "review_id": review.id
    }


# --------------------------------------------------
# GET PLAYER REVIEWS
# --------------------------------------------------

@router.get("/{player_id}")
def get_player_reviews(
    player_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    player = db.query(User).filter(
        User.id == player_id
    ).first()

    if not player:
        raise HTTPException(
            status_code=404,
            detail="Player not found"
        )

    reviews = db.query(
        Review,
        User.first_name,
        User.last_name
    ).join(
        User,
        Review.reviewer_id == User.id
    ).filter(
        Review.reviewed_user_id == player_id
    ).order_by(
        Review.id.desc()
    ).all()

    return {
        "reviews": [
            {
                "id": review.id,
                "reviewer_id": review.reviewer_id,
                "reviewer_name": f"{first_name} {last_name}",
                "comment": review.comment,
                "sentiment": review.sentiment
            }
            for review, first_name, last_name in reviews
        ],
        "total": len(reviews)
    }


# --------------------------------------------------
# DELETE OWN REVIEW
# --------------------------------------------------

@router.delete("/{review_id}")
def delete_review(
    review_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    if review.reviewer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot delete someone else's review"
        )

    db.delete(review)
    db.commit()

    return {
        "message": "Review deleted successfully"
    }