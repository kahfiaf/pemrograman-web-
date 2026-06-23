from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt

@api_view(['POST'])
@csrf_exempt
def register_user(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not username or not email or not password:
        return Response({'error': 'Missing fields'}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.create_user(username=email, email=email, password=password)
    user.first_name = username # store their display name in first_name
    user.save()
    
    return Response({'message': 'User created successfully', 'email': email}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@csrf_exempt
def login_user(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    user = authenticate(request, username=email, password=password)
    if user is not None:
        django_login(request, user)
        return Response({
            'message': 'Login successful',
            'user': {
                'username': user.first_name or user.username,
                'email': user.email
            }
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def logout_user(request):
    django_logout(request)
    return Response({'message': 'Logged out'})

from django.contrib.auth import update_session_auth_hash

@api_view(['POST'])
def change_password(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({'error': 'Missing fields'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not request.user.check_password(current_password):
        return Response({'error': 'Password saat ini salah!'}, status=status.HTTP_400_BAD_REQUEST)
        
    request.user.set_password(new_password)
    request.user.save()
    update_session_auth_hash(request, request.user)
    
    return Response({'message': 'Password changed successfully'})
@api_view(['GET'])
def list_users(request):
    users = User.objects.all()
    data = [{'username': u.first_name or u.username, 'email': u.email, 'date_joined': u.date_joined.isoformat()} for u in users]
    return Response(data)

