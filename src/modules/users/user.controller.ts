import { Request, Response, NextFunction } from 'express';
import User from '../auth/user.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';

// VULNERABILITY (idor-profile + bopla-sensitive-fields): the optional userId
// query parameter overrides the caller's identity — any authenticated user can
// read any user's full profile. The response also leaks the refreshToken and
// internal admin notes (fields the owner should never see).
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = (req.query.userId as string) || req.user!.userId;
    const user = await User.findById(targetId).select('+refreshToken +internalNotes').populate('wishlist');
    if (!user) throw new ApiError(404, 'User not found');
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (mass-assignment-profile): the request body is assigned onto
// the user document field by field. Only hard technical identifiers are
// blocked — role, email, phone, isActive, addresses, avatar, wishlist are all
// attacker-settable, so a customer can escalate to admin or hijack the email.
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const { _id, id, password, refreshToken, isProtected, ...safeBody } = req.body;
    Object.assign(user, safeBody);
    await user.save({ validateBeforeSave: false });

    sendSuccess(res, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const { label, street, city, state, zip, country, isDefault } = req.body;
    if (isDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
    }
    user.addresses.push({ label, street, city, state, zip, country, isDefault: isDefault || false });
    await user.save();

    sendSuccess(res, user.addresses, 'Address added', 201);
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (idor-update-address): the address is looked up by its id
// across ALL users — the owner of the address is never compared with the
// caller, so any authenticated user can edit any other user's address.
export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ 'addresses._id': req.params.addressId });
    if (!user) throw new ApiError(404, 'Address not found');

    const address = ((user.addresses as any) || []).find((a: any) => a._id?.toString() === req.params.addressId);
    if (!address) throw new ApiError(404, 'Address not found');

    const { label, street, city, state, zip, country, isDefault } = req.body;
    if (label !== undefined) address.label = label;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (zip !== undefined) address.zip = zip;
    if (country !== undefined) address.country = country;
    if (isDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
      address.isDefault = true;
    }

    await user.save();
    sendSuccess(res, user.addresses, 'Address updated');
  } catch (error) {
    next(error);
  }
};

// VULNERABILITY (idor-delete-address): same as update — the address is found by
// id across all users without any ownership check.
export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ 'addresses._id': req.params.addressId });
    if (!user) throw new ApiError(404, 'Address not found');

    user.addresses = (user.addresses as any).filter((addr: any) => addr._id?.toString() !== req.params.addressId);
    await user.save();
    sendSuccess(res, user.addresses, 'Address deleted');
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const productId = req.params.productId;
    const index = user.wishlist.findIndex((id) => id.toString() === productId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
      await user.save();
      sendSuccess(res, user.wishlist, 'Removed from wishlist');
    } else {
      user.wishlist.push(productId as any);
      await user.save();
      sendSuccess(res, user.wishlist, 'Added to wishlist');
    }
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find().select('-password -refreshToken').sort('-createdAt');
    sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
};

// Authenticated user deletes their own account from the profile page. The
// protected (seeded primary) admin is exempt and gets a clear 403.
export const deleteMyAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.isProtected) {
      throw new ApiError(403, 'Cannot delete the primary admin account');
    }

    await user.deleteOne();
    sendSuccess(res, null, 'Account deleted');
  } catch (error) {
    next(error);
  }
};

// Admin-only: deletes any user. The protected (seeded primary) admin can only
// be deleted by himself — which is forbidden — so it is fully protected.
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.isProtected) {
      throw new ApiError(403, 'Cannot delete the primary admin account');
    }

    await user.deleteOne();
    sendSuccess(res, null, 'User deleted');
  } catch (error) {
    next(error);
  }
};

// Admin-only: changes another user's role (customer <-> admin). The role of
// the protected (seeded primary) admin can only be changed by the owner —
// a promoted admin can never demote/promote the primary admin.
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    if (role !== 'customer' && role !== 'admin') {
      throw new ApiError(400, 'Role must be either customer or admin');
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.isProtected && user._id.toString() !== req.user!.userId) {
      throw new ApiError(403, 'Cannot change the primary admin role');
    }

    user.role = role;
    await user.save();

    const safeUser = user.toObject();
    delete (safeUser as any).password;
    delete (safeUser as any).refreshToken;
    sendSuccess(res, safeUser, 'User role updated');
  } catch (error) {
    next(error);
  }
};
