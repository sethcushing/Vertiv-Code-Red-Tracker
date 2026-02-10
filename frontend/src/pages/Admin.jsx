import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Key,
  Shield,
  User,
  Loader2,
  Search,
} from 'lucide-react';
import { api, AuthContext } from '../App';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features', icon: Shield },
  { value: 'project_manager', label: 'Project Manager', description: 'Edit assigned projects only', icon: User },
];

const Admin = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'project_manager',
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'project_manager' });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: '', 
      role: user.role 
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData = { name: formData.name, role: formData.role };
        await api.put(`/admin/users/${editingUser.id}`, updateData);
        toast.success('User updated successfully');
      } else {
        // Create new user
        if (!formData.password) {
          toast.error('Password is required for new users');
          return;
        }
        await api.post('/admin/users', formData);
        toast.success('User created successfully');
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await api.put(`/admin/users/${selectedUser.id}`, { password: newPassword });
      toast.success('Password reset successfully');
      setShowPasswordModal(false);
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const getRoleInfo = (role) => {
    return ROLES.find(r => r.value === role) || ROLES[1];
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#FE5B1B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500">{users.length} users</p>
          </div>
        </div>
        <Button
          onClick={handleAddUser}
          data-testid="add-user-btn"
          className="text-white rounded-lg font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  const RoleIcon = roleInfo.icon;
                  const isCurrentUser = user.id === currentUser?.id;
                  
                  return (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            user.role === 'admin' ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            <RoleIcon className={`w-4 h-4 ${
                              user.role === 'admin' ? 'text-orange-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            {isCurrentUser && (
                              <span className="text-xs text-gray-400">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{user.email}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(user)}
                            className="h-8 w-8 p-0"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4 text-gray-400 hover:text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            disabled={isCurrentUser}
                            className="h-8 w-8 p-0"
                            title={isCurrentUser ? "Cannot delete yourself" : "Delete User"}
                          >
                            <Trash2 className={`w-4 h-4 ${isCurrentUser ? 'text-gray-200' : 'text-gray-400 hover:text-red-500'}`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map((role) => {
              const RoleIcon = role.icon;
              return (
                <div key={role.value} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    role.value === 'admin' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    <RoleIcon className={`w-4 h-4 ${
                      role.value === 'admin' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{role.label}</p>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                disabled={!!editingUser}
              />
              {editingUser && (
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              )}
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="w-4 h-4" />
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
            <Button onClick={handleSaveUser}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Set a new password for <strong>{selectedUser?.name}</strong>
            </p>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={handleSavePassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
