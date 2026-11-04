from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.connections import Connection


router = APIRouter(
    prefix="/connections",
    tags=["Connections"]
)


@router.post("/request/{receiver_id}") # send connection request
def send_connection_request(
    receiver_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sender_id = current_user.id

    # Cannot connect with yourself
    if sender_id == receiver_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot connect with yourself"
        )

    # Check receiver exists
    receiver = db.query(User).filter(
        User.id == receiver_id
    ).first()

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail="Player not found"
        )

    # Check relationship in BOTH directions
    existing = db.query(Connection).filter(
        or_(
            and_(
                Connection.sender_id == sender_id,
                Connection.receiver_id == receiver_id
            ),
            and_(
                Connection.sender_id == receiver_id,
                Connection.receiver_id == sender_id
            )
        )
    ).first()

    if existing:

        # The other player already requested us.
        # Accept that request instead of creating another one.
        if (
            existing.sender_id == receiver_id
            and existing.receiver_id == sender_id
            and existing.status == "pending"
        ):
            existing.status = "accepted"
            existing.connected_at = datetime.now(timezone.utc)

            db.commit()

            return {
                "message": "Connection accepted",
                "status": "accepted"
            }

        raise HTTPException(
            status_code=409,
            detail="A connection request or connection already exists"
        )

    connection = Connection(
        sender_id=sender_id,
        receiver_id=receiver_id,
        status="pending",
        connected_at=None
    )

    db.add(connection)
    db.commit()
    db.refresh(connection)

    return {
        "message": "Connection request sent",
        "connection_id": connection.id,
        "status": connection.status
    }



@router.post("/{connection_id}/accept") # accept connection request
def accept_connection_request(
    connection_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    connection = db.query(Connection).filter(
        Connection.id == connection_id
    ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )

    # Only the receiver can accept
    if connection.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot accept this request"
        )

    if connection.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="This request is no longer pending"
        )

    connection.status = "accepted"
    connection.connected_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Connection accepted",
        "status": "accepted"
    }


@router.delete("/{connection_id}/reject") # reject connection request
def reject_connection_request(
    connection_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    connection = db.query(Connection).filter(
        Connection.id == connection_id
    ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )

    # Only the receiver can reject
    if connection.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot reject this request"
        )

    if connection.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="This request is no longer pending"
        )

    db.delete(connection)
    db.commit()

    return {
        "message": "Connection request rejected"
    }


@router.delete("/{connection_id}/cancel") # cancel the sent request from sender side
def cancel_connection_request(
    connection_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    connection = db.query(Connection).filter(
        Connection.id == connection_id
    ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )

    # Only sender can cancel
    if connection.sender_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot cancel this request"
        )

    if connection.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="This request is no longer pending"
        )

    db.delete(connection)
    db.commit()

    return {
        "message": "Connection request cancelled"
    }


@router.delete("/{connection_id}") # remove connection
def remove_connection(
    connection_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    connection = db.query(Connection).filter(
        Connection.id == connection_id
    ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection not found"
        )

    # Either connected player can remove it
    if current_user.id not in (
        connection.sender_id,
        connection.receiver_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot remove this connection"
        )

    if connection.status != "accepted":
        raise HTTPException(
            status_code=409,
            detail="This is not an accepted connection"
        )

    db.delete(connection)
    db.commit()

    return {
        "message": "Connection removed"
    }



@router.get("/incoming") # pending requests incoming
def get_incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = (
        db.query(Connection, User)
        .join(
            User,
            Connection.sender_id == User.id
        )
        .filter(
            Connection.receiver_id == current_user.id,
            Connection.status == "pending"
        )
        .order_by(Connection.id.desc())
        .all()
    )

    return {
        "requests": [
            {
                "connection_id": connection.id,
                "player": {
                    "id": player.id,
                    "first_name": player.first_name,
                    "last_name": player.last_name,
                    "city": player.city,
                    "bio": player.bio
                }
            }
            for connection, player in requests
        ],
        "total": len(requests)
    }


@router.get("/sent") # pending connection requests outgoing
def get_sent_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = (
        db.query(Connection, User)
        .join(
            User,
            Connection.receiver_id == User.id
        )
        .filter(
            Connection.sender_id == current_user.id,
            Connection.status == "pending"
        )
        .order_by(Connection.id.desc())
        .all()
    )

    return {
        "requests": [
            {
                "connection_id": connection.id,
                "player": {
                    "id": player.id,
                    "first_name": player.first_name,
                    "last_name": player.last_name,
                    "city": player.city,
                    "bio": player.bio
                }
            }
            for connection, player in requests
        ],
        "total": len(requests)
    }


@router.get("") # accepted/current connections
def get_connections(
    search: str | None = Query(
        default=None,
        max_length=100
    ),

    sort: str = Query(
        default="recent",
        pattern="^(recent|alphabetical)$"
    ),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # The connected player could be either sender or receiver
    query = (
        db.query(Connection, User)
        .join(
            User,
            or_(
                and_(
                    Connection.sender_id == current_user.id,
                    Connection.receiver_id == User.id
                ),
                and_(
                    Connection.receiver_id == current_user.id,
                    Connection.sender_id == User.id
                )
            )
        )
        .filter(
            Connection.status == "accepted"
        )
    )

    # Name search
    if search and search.strip():
        search_term = search.strip()

        query = query.filter(
            or_(
                User.first_name.ilike(f"%{search_term}%"),
                User.last_name.ilike(f"%{search_term}%")
            )
        )

    # Sorting
    if sort == "alphabetical":
        query = query.order_by(
            User.first_name.asc(),
            User.last_name.asc()
        )
    else:
        query = query.order_by(
            Connection.connected_at.desc()
        )

    results = query.all()

    return {
        "connections": [
            {
                "connection_id": connection.id,
                "connected_at": connection.connected_at,
                "player": {
                    "id": player.id,
                    "first_name": player.first_name,
                    "last_name": player.last_name,
                    "city": player.city,
                    "bio": player.bio
                }
            }
            for connection, player in results
        ],
        "total": len(results)
    }