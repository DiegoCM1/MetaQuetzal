from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

#POST
async def upload_feedback(db: AsyncSession, rating: int, email: str | None, message: str):
    result = await db.execute(text("""INSERT INTO public.feedback (rating, email, message)
     VALUES (:rating, :email, :message)
     RETURNING id;"""), 
     {"rating": rating, "email": email, "message": message})

    await db.commit()

    row = result.mappings().first()

    return row["id"]

#GET
async def get_all_feedback(db: AsyncSession):
    result = await db.execute(text("""SELECT id, rating, email, message, created_at
     FROM public.feedback
     ORDER BY created_at DESC;"""))

    return result.mappings().all()

